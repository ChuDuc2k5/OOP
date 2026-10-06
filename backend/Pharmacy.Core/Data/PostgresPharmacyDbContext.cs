using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Pharmacy.Core.Data;

public sealed class PostgresPharmacyDbContext(DbContextOptions<PostgresPharmacyDbContext> options)
    : PharmacyDbContext(options);

public sealed class DateTimeOffsetUtcConverter() : ValueConverter<DateTimeOffset, DateTimeOffset>(
    value => value.ToUniversalTime(), value => value.ToUniversalTime());
