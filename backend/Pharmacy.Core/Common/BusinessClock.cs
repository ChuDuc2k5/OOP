using System.Globalization;

namespace Pharmacy.Core.Common;

public interface IBusinessClock
{
    DateOnly Today { get; }
    DateTimeOffset Now { get; }
}

public sealed class BusinessClock(string? dateOverride = null) : IBusinessClock
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Ho_Chi_Minh");
    public DateTimeOffset Now => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Zone);
    public DateOnly Today => dateOverride is null ? DateOnly.FromDateTime(Now.DateTime)
        : DateOnly.ParseExact(dateOverride, "yyyy-MM-dd", CultureInfo.InvariantCulture);
}

public interface IInventoryLock { Task<IDisposable> AcquireAsync(CancellationToken cancellationToken = default); }
public sealed class InventoryLock : IInventoryLock
{
    private readonly SemaphoreSlim semaphore = new(1, 1);
    public async Task<IDisposable> AcquireAsync(CancellationToken cancellationToken = default)
    {
        await semaphore.WaitAsync(cancellationToken);
        return new Lease(semaphore);
    }
    private sealed class Lease(SemaphoreSlim semaphore) : IDisposable
    {
        private bool disposed;
        public void Dispose() { if (!disposed) { disposed = true; semaphore.Release(); } }
    }
}
