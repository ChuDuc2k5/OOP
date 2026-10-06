using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Data;
using Npgsql;

namespace Pharmacy.Api.Infrastructure;

public static class DatabaseConfiguration
{
    public static void Register(IServiceCollection services, IConfiguration config, string contentRoot)
    {
        var provider = config["Database:Provider"] ?? "Sqlite";
        var connection = config.GetConnectionString("Default");
        if (provider == "Postgres")
        {
            if (string.IsNullOrWhiteSpace(connection) || string.IsNullOrWhiteSpace(new NpgsqlConnectionStringBuilder(connection).Host))
            {
                throw new InvalidOperationException("Postgres requires ConnectionStrings:Default in Npgsql format.");
            }
            services.AddDbContext<PostgresPharmacyDbContext>(o => o.UseNpgsql(connection,
                postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", "pharmacy")));
            services.AddScoped<PharmacyDbContext>(sp => sp.GetRequiredService<PostgresPharmacyDbContext>());
        }
        else if (provider == "Sqlite")
        {
            var sqlite = new SqliteConnectionStringBuilder(connection ?? "Data Source=../data/pharmacy.db");
            if (sqlite.DataSource != ":memory:")
            {
                sqlite.DataSource = Path.GetFullPath(sqlite.DataSource, contentRoot);
                Directory.CreateDirectory(Path.GetDirectoryName(sqlite.DataSource)!);
            }
            services.AddDbContext<PharmacyDbContext>(o => o.UseSqlite(sqlite.ToString()));
        }
        else
        {
            throw new InvalidOperationException("Database:Provider must be Sqlite or Postgres.");
        }
    }
}
