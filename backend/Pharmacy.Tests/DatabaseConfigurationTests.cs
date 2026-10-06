using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pharmacy.Api.Infrastructure;
using Pharmacy.Core.Data;

namespace Pharmacy.Tests;

public sealed class DatabaseConfigurationTests
{
    [Fact]
    public void EnvironmentFile_ParsesConnectionsWithoutExportingSecretsToProcess()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-env-" + Guid.NewGuid());
        try
        {
            File.WriteAllText(path, "# Config\nDatabase__Provider=Postgres\nConnectionStrings__Default='Host=localhost;Database=test;Username=test;Password=example=a;'\nEmpty=\n");
            var values = EnvironmentFile.Read(path);
            Assert.Equal("Postgres", values["Database:Provider"]);
            Assert.EndsWith("Password=example=a;", values["ConnectionStrings:Default"]);
            Assert.DoesNotContain("Empty", values.Keys);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Theory]
    [InlineData("Sqlite")]
    [InlineData("Postgres")]
    public void Registration_ResolvesCorrectContextWithoutOpeningConnection(string provider)
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = provider,
            ["ConnectionStrings:Default"] = provider == "Sqlite" ? "Data Source=:memory:"
                : "Host=localhost;Database=test;Username=test;Password=example;SSL Mode=Require"
        }).Build();
        DatabaseConfiguration.Register(services, config, Path.GetTempPath());
        using var serviceProvider = services.BuildServiceProvider();
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
        Assert.Equal(provider == "Sqlite", db.Database.IsSqlite());
        Assert.Equal(provider == "Postgres", db.Database.IsNpgsql());
        if (provider == "Postgres")
        {
            Assert.Same(db, scope.ServiceProvider.GetRequiredService<PostgresPharmacyDbContext>());
        }
    }
}
