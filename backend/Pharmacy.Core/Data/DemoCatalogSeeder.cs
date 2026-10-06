using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Data;

public sealed record DemoCatalogSeedResult(int DrugsAdded, int BatchesAdded, int ImagesAttached, int ImageFilesAdded);

public sealed class DemoCatalogSeeder(
    PharmacyDbContext db,
    IBusinessClock clock,
    StorageOptions storage)
{
    public async Task<DemoCatalogSeedResult> SeedAsync(CancellationToken ct = default)
    {
        await using var source = Resource("Seed.catalog.json");
        var catalog = await JsonSerializer.DeserializeAsync<Catalog>(source,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, ct)
            ?? throw new InvalidOperationException("Demo catalog is empty.");
        await using var transaction = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(ct) : null;
        var ids = catalog.Drugs.Select(x => x.Id).Concat(catalog.LegacyImages.Keys).ToList();
        var existing = await db.Drugs.Where(x => ids.Contains(x.DrugId)).ToDictionaryAsync(x => x.DrugId, ct);
        var drugsAdded = 0;
        var batchesAdded = 0;
        for (var index = 0; index < catalog.Drugs.Count; index++)
        {
            var entry = catalog.Drugs[index];
            if (existing.ContainsKey(entry.Id))
            {
                continue;
            }
            var drug = new Drug(entry.Id, entry.Name, entry.Unit, entry.Price, entry.Threshold,
                entry.Rx, entry.Controlled, true, entry.Description);
            var count = index % 3 == 0 ? 3 : 2;
            for (var batchIndex = 0; batchIndex < count; batchIndex++)
            {
                var days = 60 + (index * 37 + batchIndex * 139) % 481;
                if (index % 8 == 0 && batchIndex == 0)
                {
                    days = 7 + index % 23;
                }
                var quantity = 20 + (index * 17 + batchIndex * 29) % 181;
                var batch = new DrugBatch($"BC{index:D6}{batchIndex}", entry.Id,
                    $"L{clock.Today:yy}{batchIndex + 1:D3}", clock.Today.AddDays(days), quantity);
                // A few demo batches have already been used: keep received quantity, show low remaining stock.
                if (index % 11 == 0)
                {
                    batch.Deduct(quantity - Math.Max(1, entry.Threshold / count), clock.Today);
                }
                drug.AddBatch(batch);
                batchesAdded++;
            }
            db.Drugs.Add(drug);
            existing.Add(entry.Id, drug);
            drugsAdded++;
        }
        var imagesAttached = 0;
        var filesAdded = 0;
        foreach (var drug in existing.Values)
        {
            if (!string.IsNullOrWhiteSpace(drug.ImagePath))
            {
                continue;
            }
            var directory = Path.Combine(storage.Root, "drugs");
            Directory.CreateDirectory(directory);
            var fileName = drug.DrugId + ".png";
            var path = Path.Combine(directory, fileName);
            if (!File.Exists(path))
            {
                if (await CopyImage(fileName, path, ct))
                {
                    filesAdded++;
                }
            }
            drug.SetImage("drugs/" + fileName);
            imagesAttached++;
        }
        await db.SaveChangesAsync(ct);
        if (transaction is not null)
        {
            await transaction.CommitAsync(ct);
        }
        return new(drugsAdded, batchesAdded, imagesAttached, filesAdded);
    }

    private static async Task<bool> CopyImage(string fileName, string path, CancellationToken ct)
    {
        var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var image = Resource("Assets.drugs." + fileName))
            await using (var destination = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write))
            {
                await image.CopyToAsync(destination, ct);
            }
            try
            {
                File.Move(temporary, path, overwrite: false);
                return true;
            }
            catch (IOException) when (File.Exists(path))
            {
                return false;
            }
        }
        finally
        {
            File.Delete(temporary);
        }
    }

    private static Stream Resource(string name)
        => typeof(DemoCatalogSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data." + name)
            ?? throw new InvalidOperationException("Missing embedded demo catalog resource: " + name);

    private sealed record Catalog(Dictionary<string, JsonElement> LegacyImages, List<CatalogDrug> Drugs);
    private sealed record CatalogDrug(string Id, string Name, string Unit, decimal Price,
        int Threshold, bool Rx, bool Controlled, string Description);
}
