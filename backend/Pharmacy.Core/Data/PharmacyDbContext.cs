using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pharmacy.Core.Domain;
namespace Pharmacy.Core.Data;

public sealed class DailySequence
{
    public string Key { get; set; } = "";
    public int Value
    {
        get; set;
    }
}

public class PharmacyDbContext : DbContext
{
    public PharmacyDbContext(DbContextOptions<PharmacyDbContext> options) : base(options)
    {
    }

    protected PharmacyDbContext(DbContextOptions options) : base(options)
    {
    }
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<Drug> Drugs => Set<Drug>();
    public DbSet<DrugBatch> DrugBatches => Set<DrugBatch>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PaymentSetting> PaymentSettings => Set<PaymentSetting>();
    public DbSet<StockReservation> StockReservations => Set<StockReservation>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<BatchAllocation> BatchAllocations => Set<BatchAllocation>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    protected override void OnModelCreating(ModelBuilder m)
    {
        if (Database.IsNpgsql())
        {
            m.HasDefaultSchema("pharmacy");
        }
        m.Entity<UserAccount>().HasKey(x => x.UserId);
        m.Entity<UserAccount>().HasIndex(x => x.NormalizedUsername).IsUnique();
        m.Entity<Drug>().HasKey(x => x.DrugId);
        m.Entity<Drug>().HasMany(x => x.Batches).WithOne().HasForeignKey(x => x.DrugId);
        m.Entity<DrugBatch>().HasKey(x => x.BatchId);
        m.Entity<DrugBatch>().HasIndex(x => new { x.DrugId, x.BatchNumber }).IsUnique();
        m.Entity<Prescription>().HasKey(x => x.PrescriptionId);
        UserFk(m.Entity<Prescription>(), nameof(Prescription.OwnerUserId));
        UserFk(m.Entity<Prescription>(), nameof(Prescription.CreatedByUserId));
        UserFk(m.Entity<Prescription>(), nameof(Prescription.ReviewedByUserId));
        m.Entity<Prescription>().HasMany(x => x.Items).WithOne().HasForeignKey(x => x.PrescriptionId);
        m.Entity<PrescriptionItem>().HasKey(x => x.ItemId);
        m.Entity<PrescriptionItem>().HasIndex(x => new { x.PrescriptionId, x.DrugId }).IsUnique();
        DrugFk(m.Entity<PrescriptionItem>());
        m.Entity<CartItem>().HasKey(x => new { x.UserId, x.DrugId });
        UserFk(m.Entity<CartItem>(), nameof(CartItem.UserId));
        DrugFk(m.Entity<CartItem>());
        m.Entity<Order>().HasKey(x => x.OrderId);
        UserFk(m.Entity<Order>(), nameof(Order.UserId));
        UserFk(m.Entity<Order>(), nameof(Order.HandledByUserId));
        m.Entity<Order>().HasOne<Prescription>().WithMany().HasForeignKey(x => x.PrescriptionId);
        m.Entity<Order>().HasMany(x => x.Items).WithOne().HasForeignKey(x => x.OrderId);
        m.Entity<OrderItem>().HasKey(x => x.OrderItemId);
        DrugFk(m.Entity<OrderItem>());
        m.Entity<OrderItem>().HasIndex(x => new { x.OrderId, x.DrugId }).IsUnique();
        m.Entity<Payment>().HasKey(x => x.PaymentId);
        m.Entity<Payment>().HasOne<Order>().WithOne().HasForeignKey<Payment>(x => x.OrderId);
        m.Entity<Payment>().HasIndex(x => x.OrderId).IsUnique();
        m.Entity<Payment>().HasIndex(x => x.BankReference).IsUnique().HasFilter("\"Status\" = 'Confirmed'");
        UserFk(m.Entity<Payment>(), nameof(Payment.ApprovedByUserId));
        m.Entity<PaymentSetting>().HasKey(x => x.Id);
        m.Entity<StockReservation>().HasKey(x => x.ReservationId);
        m.Entity<StockReservation>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId);
        DrugFk(m.Entity<StockReservation>());
        m.Entity<StockReservation>().HasOne<PrescriptionItem>().WithMany().HasForeignKey(x => x.PrescriptionItemId);
        m.Entity<StockReservation>().HasIndex(x => new { x.OrderId, x.DrugId }).IsUnique().HasFilter("\"Status\" = 'Active'");
        m.Entity<Sale>().HasKey(x => x.SaleId);
        m.Entity<Sale>().HasDiscriminator(x => x.Kind).HasValue<OTCSale>(SaleKind.OTC).HasValue<PrescriptionSale>(SaleKind.Prescription);
        UserFk(m.Entity<Sale>(), nameof(Sale.CreatedByUserId));
        UserFk(m.Entity<Sale>(), nameof(Sale.BuyerUserId));
        m.Entity<Sale>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId);
        m.Entity<Sale>().HasOne<Prescription>().WithMany().HasForeignKey(x => x.PrescriptionId);
        m.Entity<Sale>().HasIndex(x => x.OrderId).IsUnique().HasFilter("\"Status\" = 'Completed' AND \"OrderId\" IS NOT NULL");
        m.Entity<Sale>().HasMany(x => x.Items).WithOne().HasForeignKey(x => x.SaleId);
        m.Entity<SaleItem>().HasKey(x => x.SaleItemId);
        DrugFk(m.Entity<SaleItem>());
        m.Entity<SaleItem>().HasIndex(x => new { x.SaleId, x.DrugId }).IsUnique();
        m.Entity<SaleItem>().HasMany(x => x.Allocations).WithOne().HasForeignKey(x => x.SaleItemId);
        m.Entity<BatchAllocation>().HasKey(x => x.AllocationId);
        m.Entity<BatchAllocation>().HasOne<DrugBatch>().WithMany().HasForeignKey(x => x.BatchId);
        m.Entity<Invoice>().HasKey(x => x.InvoiceId);
        m.Entity<Invoice>().HasOne(x => x.Sale).WithOne().HasForeignKey<Invoice>(x => x.SaleId);
        m.Entity<Invoice>().HasIndex(x => x.SaleId).IsUnique();
        m.Entity<DailySequence>().HasKey(x => x.Key);
        foreach (var entity in m.Model.GetEntityTypes())
        {
            foreach (var p in entity.GetProperties())
            {
                var type = Nullable.GetUnderlyingType(p.ClrType) ?? p.ClrType;
                if (type.IsEnum)
                {
                    m.Entity(entity.ClrType).Property(p.Name).HasConversion<string>();
                }

                if (p.Name == "Version")
                {
                    m.Entity(entity.ClrType).Property(p.Name).IsConcurrencyToken();
                }
                if (Database.IsNpgsql() && type == typeof(DateTimeOffset))
                {
                    m.Entity(entity.ClrType).Property(p.Name)
                        .HasConversion<DateTimeOffsetUtcConverter>()
                        .HasColumnType("timestamp with time zone");
                }
            }
            foreach (var fk in entity.GetForeignKeys())
            {
                fk.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
        Check<Drug>(m, "DrugRules", "length(trim(Name)) > 0 AND length(trim(SaleUnit)) > 0 AND CAST(UnitPrice AS REAL) > 0 AND CAST(UnitPrice AS REAL) = CAST(UnitPrice AS INTEGER) AND LowStockThreshold >= 0 AND (IsControlled = 0 OR RequiresPrescription = 1)");
        Check<DrugBatch>(m, "BatchQuantity", "InitialQuantity > 0 AND Quantity >= 0 AND Quantity <= InitialQuantity AND length(trim(BatchNumber)) > 0");
        Check<PrescriptionItem>(m, "PrescriptionQuantity", "PrescribedQuantity > 0 AND DispensedQuantity >= 0 AND DispensedQuantity <= PrescribedQuantity");
        Check<CartItem>(m, "CartQuantity", "Quantity > 0");
        Check<StockReservation>(m, "ReservationRules", "Quantity > 0 AND Status IN ('Active','Consumed','Released')");
        Check<BatchAllocation>(m, "AllocationQuantity", "Quantity > 0");
        foreach (var t in new[] { typeof(OrderItem), typeof(SaleItem) })
        {
            m.Entity(t).ToTable(tb => tb.HasCheckConstraint("CK_" + t.Name + "_Money", ConstraintSql(m, "Quantity > 0 AND CAST(UnitPrice AS REAL) > 0 AND CAST(UnitPrice AS REAL) = CAST(UnitPrice AS INTEGER) AND CAST(LineTotal AS REAL) = Quantity * CAST(UnitPrice AS REAL)")));
        }

        Check<UserAccount>(m, "AccountRules", "length(Username) BETWEEN 3 AND 30 AND Username NOT GLOB '*[^A-Za-z0-9._-]*' AND length(PasswordHash) > 0 AND NormalizedUsername = upper(trim(Username)) AND Role IN ('User','Staff','Admin')");
        Check<PaymentSetting>(m, "Singleton", "Id = 1");
        Check<Order>(m, "OrderRules", "SaleKind IN ('OTC','Prescription') AND ReceiveMethod IN ('Pickup','Delivery') AND Status IN ('WaitingReview','AwaitingPayment','Preparing','Delivering','Completed','Cancelled','Rejected') AND length(trim(ReceiverName)) > 0 AND length(trim(Phone)) > 0 AND (ReceiveMethod <> 'Delivery' OR (Address IS NOT NULL AND length(trim(Address)) > 0)) AND (SaleKind <> 'Prescription' OR (PrescriptionId IS NOT NULL AND PatientId IS NOT NULL)) AND CAST(TotalAmount AS REAL) >= 0 AND CAST(TotalAmount AS REAL) = CAST(TotalAmount AS INTEGER)");
        Check<Prescription>(m, "PrescriptionRules", "Status IN ('PendingReview','Approved','Rejected','Cancelled') AND length(trim(PatientId)) > 0 AND length(trim(PatientName)) > 0 AND (IssueDate IS NULL OR ValidUntil IS NULL OR IssueDate <= ValidUntil) AND (Status <> 'Approved' OR (IssueDate IS NOT NULL AND ValidUntil IS NOT NULL AND PrescriberName IS NOT NULL AND length(trim(PrescriberName)) > 0))");
        Check<Sale>(m, "SaleRules", "Kind IN ('OTC','Prescription') AND Channel IN ('Counter','Online') AND Status IN ('Draft','Completed','Cancelled') AND CAST(TotalAmount AS REAL) >= 0 AND CAST(TotalAmount AS REAL) = CAST(TotalAmount AS INTEGER) AND (Kind <> 'Prescription' OR (PrescriptionId IS NOT NULL AND PatientId IS NOT NULL)) AND (Status <> 'Completed' OR (CompletedAt IS NOT NULL AND PaymentMethod IS NOT NULL AND ((Channel='Counter' AND PaymentMethod='Cash') OR (Channel='Online' AND PaymentMethod='ManualQR'))))");
        Check<Payment>(m, "PaymentStatus", "Status IN ('PendingReview','Confirmed','Closed') AND length(trim(BankName)) > 0 AND length(trim(AccountNumber)) > 0 AND length(trim(AccountName)) > 0 AND length(trim(QrImagePath)) > 0");
        Check<Payment>(m, "PaymentRules", "CAST(ExpectedAmount AS REAL) > 0 AND CAST(ExpectedAmount AS REAL) = CAST(ExpectedAmount AS INTEGER) AND (ReceivedAmount IS NULL OR (CAST(ReceivedAmount AS REAL) >= 0 AND CAST(ReceivedAmount AS REAL) = CAST(ReceivedAmount AS INTEGER))) AND (Status <> 'Confirmed' OR (ApprovedByUserId IS NOT NULL AND ApprovedAt IS NOT NULL AND CAST(ReceivedAmount AS REAL) >= CAST(ExpectedAmount AS REAL)))");
    }
    private static void UserFk<T>(EntityTypeBuilder<T> b, string field) where T : class => b.HasOne<UserAccount>().WithMany().HasForeignKey(field);
    private static void DrugFk<T>(EntityTypeBuilder<T> b) where T : class => b.HasOne<Drug>().WithMany().HasForeignKey("DrugId");
    private static void Check<T>(ModelBuilder m, string name, string sql) where T : class
        => m.Entity<T>().ToTable(t => t.HasCheckConstraint("CK_" + typeof(T).Name + "_" + name, ConstraintSql(m, sql)));

    private static string ConstraintSql(ModelBuilder m, string sql)
    {
        if (m.Model.GetDefaultSchema() != "pharmacy")
        {
            return sql;
        }
        sql = System.Text.RegularExpressions.Regex.Replace(sql, @"CAST\((\w+) AS REAL\)", "$1");
        sql = System.Text.RegularExpressions.Regex.Replace(sql, @"CAST\((\w+) AS INTEGER\)", "trunc($1)");
        sql = sql.Replace("IsControlled = 0", "IsControlled = FALSE")
            .Replace("RequiresPrescription = 1", "RequiresPrescription = TRUE")
            .Replace("Username NOT GLOB '*[^A-Za-z0-9._-]*'", "Username ~ '^[A-Za-z0-9._-]+$'");
        var names = m.Model.GetEntityTypes().SelectMany(x => x.GetProperties()).Select(x => x.Name).Distinct();
        var pattern = @"\b(" + string.Join("|", names) + @")\b";
        return System.Text.RegularExpressions.Regex.Replace(sql, pattern, match => "\"" + match.Value + "\"");
    }
    private void AdvanceVersions()
    {
        ChangeTracker.DetectChanges();
        foreach (var entry in ChangeTracker.Entries<VersionedEntity>().Where(e => e.State == EntityState.Modified))
        {
            entry.Property(x => x.Version).CurrentValue = checked(entry.Property(x => x.Version).OriginalValue + 1);
        }
    }
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        AdvanceVersions();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }
    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        AdvanceVersions();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }
}
