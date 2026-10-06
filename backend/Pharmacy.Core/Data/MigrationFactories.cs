using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pharmacy.Core.Data;

public sealed class SqliteMigrationFactory : IDesignTimeDbContextFactory<PharmacyDbContext>
{
    public PharmacyDbContext CreateDbContext(string[] args)
        => new(new DbContextOptionsBuilder<PharmacyDbContext>().UseSqlite("Data Source=:memory:").Options);
}

public sealed class PostgresMigrationFactory : IDesignTimeDbContextFactory<PostgresPharmacyDbContext>
{
    public PostgresPharmacyDbContext CreateDbContext(string[] args)
        => new(new DbContextOptionsBuilder<PostgresPharmacyDbContext>()
            .UseNpgsql("Host=localhost;Database=pharmacy;Username=postgres",
                postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", "pharmacy")).Options);
}
