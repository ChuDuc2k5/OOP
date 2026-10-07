using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Data;

public sealed record CatalogSeedResult(int DrugsAdded, int BatchesAdded, int ImagesAttached, int ImageFilesAdded);

public sealed class CatalogSeeder(
    PharmacyDbContext db,
    IBusinessClock clock,
    StorageOptions storage)
{
    public async Task<CatalogSeedResult> SeedAsync(CancellationToken ct = default)
    {
        await using var source = Resource("Seed.catalog.json");
        var catalog = await JsonSerializer.DeserializeAsync<Catalog>(source,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, ct)
            ?? throw new InvalidOperationException("Catalog is empty.");
        await using var transaction = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(ct) : null;
        var ids = catalog.Drugs.Select(x => x.Id).ToList();
        var existing = await db.Drugs.Include(x => x.Batches).Where(x => ids.Contains(x.DrugId)).ToDictionaryAsync(x => x.DrugId, ct);
        var drugsAdded = 0;
        var batchesAdded = 0;
        for (var index = 0; index < catalog.Drugs.Count; index++)
        {
            var entry = catalog.Drugs[index];
            if (!existing.TryGetValue(entry.Id, out var drug))
            {
                drug = new Drug(entry.Id, entry.Name, entry.Unit, entry.Price, entry.Threshold,
                    entry.Rx, entry.Controlled, true, entry.Description);
                db.Drugs.Add(drug);
                existing.Add(entry.Id, drug);
                drugsAdded++;
            }
            var count = index % 3 == 0 ? 3 : 2;
            for (var batchIndex = 0; batchIndex < count; batchIndex++)
            {
                var batchId = $"BR{index:D6}{batchIndex}";
                var batchNumber = $"L{clock.Today:yy}{batchIndex + 1:D3}";
                if (drug.Batches.Any(x => x.BatchId == batchId || x.BatchNumber == batchNumber))
                {
                    continue;
                }
                var days = 60 + (index * 37 + batchIndex * 139) % 481;
                if (index > 2 && index % 4 == 0 && batchIndex == 0)
                {
                    days = 7 + index % 23;
                }
                if (index == 3 && batchIndex == 0)
                {
                    days = -5;
                }
                var quantity = 20 + (index * 17 + batchIndex * 29) % 181;
                var batch = new DrugBatch(batchId, entry.Id,
                    batchNumber, clock.Today.AddDays(days), quantity);
                // A few batches have already been used: keep received quantity, show low remaining stock.
                if (index < 3)
                {
                    batch.Deduct(quantity - (index == 2 ? 0 : Math.Max(1, entry.Threshold / count)), clock.Today);
                }
                drug.AddBatch(batch);
                batchesAdded++;
            }
        }
        var imagesAttached = 0;
        var filesAdded = 0;
        foreach (var drug in existing.Values)
        {
            var imagePath = "drugs/" + drug.DrugId + ".png";
            if (!string.IsNullOrWhiteSpace(drug.ImagePath) && drug.ImagePath != imagePath)
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
            if (string.IsNullOrWhiteSpace(drug.ImagePath))
            {
                drug.SetImage(imagePath);
                imagesAttached++;
            }
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
        => typeof(CatalogSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data." + name)
            ?? throw new InvalidOperationException("Missing embedded catalog resource: " + name);

    private sealed record Catalog(List<CatalogDrug> Drugs);
    private sealed record CatalogDrug(string Id, string Name, string Unit, decimal Price,
        int Threshold, bool Rx, bool Controlled, string Description);
}
