namespace Pharmacy.Core.Data;

public interface IDbSeeder
{
    Task SeedAsync(CancellationToken ct = default);
}