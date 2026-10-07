namespace Pharmacy.Tests;

internal static class TestImage
{
    public static byte[] Bytes => Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=");
    public static Stream Open() => new MemoryStream(Bytes, writable: false);
}