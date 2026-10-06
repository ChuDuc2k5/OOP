namespace Pharmacy.Core.Common;

public sealed record StorageOptions(string Root);
public interface IFileStorage
{
    Task<string> SaveAsync(
string category,
Stream content,
string fileName,
string contentType,
CancellationToken ct = default);
    Stream OpenRead(string category, string fileName);
}

public sealed class LocalFileStorage(string root) : IFileStorage
{
    public const int MaxBytes = 5 * 1024 * 1024;
    private static string Category(string category) => category is "drugs" or "prescriptions" or "qr" ? category : throw new ArgumentException("Unknown storage category");
    public async Task<string> SaveAsync(
        string category,
        Stream content,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        Category(category);
        await using var buffer = new MemoryStream();
        var chunk = new byte[8192];
        int count;
        while ((count = await content.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + count > MaxBytes)
            {
                throw Invalid();
            }

            await buffer.WriteAsync(chunk.AsMemory(0, count), ct);
        }
        var bytes = buffer.ToArray();
        var png = bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var jpg = bytes.Length >= 4 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255 && bytes[^2] == 255 && bytes[^1] == 217;
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!(png && ext == ".png" && contentType == "image/png" || jpg && ext is ".jpg" or ".jpeg" && contentType == "image/jpeg"))
        {
            throw Invalid();
        }

        var name = Guid.NewGuid().ToString("N") + (png ? ".png" : ".jpg");
        var directory = Path.Combine(Path.GetFullPath(root), category);
        Directory.CreateDirectory(directory);
        await File.WriteAllBytesAsync(Path.Combine(directory, name), bytes, ct);
        return category + "/" + name;
    }
    public Stream OpenRead(string category, string fileName)
    {
        Category(category);
        if (string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName) || fileName.IndexOfAny(['/', '\\', ':']) >= 0 || fileName is "." or "..")
        {
            throw new BusinessException("NOT_FOUND", "Không tìm thấy ảnh.");
        }

        var path = Path.Combine(Path.GetFullPath(root), category, fileName);
        if (!File.Exists(path))
        {
            throw new BusinessException("NOT_FOUND", "Không tìm thấy ảnh.");
        }

        return File.OpenRead(path);
    }
    private static BusinessException Invalid() => new("FILE_INVALID", "Ảnh phải là PNG/JPEG và không quá 5 MB.");
}
