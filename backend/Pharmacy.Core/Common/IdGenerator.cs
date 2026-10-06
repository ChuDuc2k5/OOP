using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Pharmacy.Core.Data;
namespace Pharmacy.Core.Common;

public sealed class IdGenerator(PharmacyDbContext db, IBusinessClock clock)
{
    public string User() => "U" + Convert.ToHexString(RandomNumberGenerator.GetBytes(4));
    public string Batch() => "B" + Convert.ToHexString(RandomNumberGenerator.GetBytes(4));
    public string Item() => Guid.NewGuid().ToString("N");
    public async Task<string> NextAsync(string prefix, CancellationToken ct = default)
    {
        if (prefix is not ("DH" or "DT" or "BH" or "HD" or "TT"))
        {
            throw new ArgumentException("Unknown prefix", nameof(prefix));
        }

        var key = prefix + clock.Today.ToString("yyMMdd");
        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            await using var command = connection.CreateCommand();
            command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
            command.CommandText = "INSERT INTO DailySequence (Key, Value) VALUES ($key, 1) ON CONFLICT(Key) DO UPDATE SET Value = Value + 1 WHERE Value < 9999 RETURNING Value;";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "$key";
            parameter.Value = key;
            command.Parameters.Add(parameter);
            var value = await command.ExecuteScalarAsync(ct);
            if (value is null)
            {
                throw new BusinessException("INVALID_STATE", "Đã hết mã giao dịch trong ngày.");
            }

            return key + Convert.ToInt32(value).ToString("D4");
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
