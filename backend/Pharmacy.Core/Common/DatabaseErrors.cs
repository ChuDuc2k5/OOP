using Microsoft.Data.Sqlite;
using Npgsql;

namespace Pharmacy.Core.Common;

public static class DatabaseErrors
{
    public static bool IsUniqueViolation(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is SqliteException { SqliteExtendedErrorCode: 2067 or 1555 }
                or PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }
        return false;
    }
}
