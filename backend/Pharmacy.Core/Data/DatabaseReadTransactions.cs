using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace Pharmacy.Core.Data;

public static class DatabaseReadTransactions
{
    public static Task<IDbContextTransaction> BeginReadSnapshotAsync(this DatabaseFacade database, CancellationToken ct)
        => database.BeginTransactionAsync(database.IsNpgsql() ? IsolationLevel.RepeatableRead : IsolationLevel.Serializable, ct);
}
