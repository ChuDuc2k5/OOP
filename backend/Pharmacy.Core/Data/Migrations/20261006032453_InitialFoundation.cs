using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pharmacy.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailySequence",
                columns: table => new
                {
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailySequence", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "Drugs",
                columns: table => new
                {
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    ImagePath = table.Column<string>(type: "TEXT", nullable: true),
                    SaleUnit = table.Column<string>(type: "TEXT", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    LowStockThreshold = table.Column<int>(type: "INTEGER", nullable: false),
                    RequiresPrescription = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsControlled = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsForSale = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Drugs", x => x.DrugId);
                    table.CheckConstraint("CK_Drug_DrugRules", "length(trim(Name)) > 0 AND length(trim(SaleUnit)) > 0 AND CAST(UnitPrice AS REAL) > 0 AND CAST(UnitPrice AS REAL) = CAST(UnitPrice AS INTEGER) AND LowStockThreshold >= 0 AND (IsControlled = 0 OR RequiresPrescription = 1)");
                });

            migrationBuilder.CreateTable(
                name: "PaymentSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BankName = table.Column<string>(type: "TEXT", nullable: false),
                    AccountNumber = table.Column<string>(type: "TEXT", nullable: false),
                    AccountName = table.Column<string>(type: "TEXT", nullable: false),
                    QrImagePath = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentSettings", x => x.Id);
                    table.CheckConstraint("CK_PaymentSetting_Singleton", "Id = 1");
                });

            migrationBuilder.CreateTable(
                name: "UserAccounts",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Username = table.Column<string>(type: "TEXT", nullable: false),
                    NormalizedUsername = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAccounts", x => x.UserId);
                    table.CheckConstraint("CK_UserAccount_AccountRules", "length(Username) BETWEEN 3 AND 30 AND Username NOT GLOB '*[^A-Za-z0-9._-]*' AND length(PasswordHash) > 0 AND NormalizedUsername = upper(trim(Username)) AND Role IN ('User','Staff','Admin')");
                });

            migrationBuilder.CreateTable(
                name: "DrugBatches",
                columns: table => new
                {
                    BatchId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    BatchNumber = table.Column<string>(type: "TEXT", nullable: false),
                    ExpiryDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    InitialQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DrugBatches", x => x.BatchId);
                    table.CheckConstraint("CK_DrugBatch_BatchQuantity", "InitialQuantity > 0 AND Quantity >= 0 AND Quantity <= InitialQuantity AND length(trim(BatchNumber)) > 0");
                    table.ForeignKey(
                        name: "FK_DrugBatches_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CartItems",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItems", x => new { x.UserId, x.DrugId });
                    table.CheckConstraint("CK_CartItem_CartQuantity", "Quantity > 0");
                    table.ForeignKey(
                        name: "FK_CartItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CartItems_UserAccounts_UserId",
                        column: x => x.UserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Prescriptions",
                columns: table => new
                {
                    PrescriptionId = table.Column<string>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "TEXT", nullable: false),
                    PatientId = table.Column<string>(type: "TEXT", nullable: false),
                    PatientName = table.Column<string>(type: "TEXT", nullable: false),
                    PrescriberName = table.Column<string>(type: "TEXT", nullable: true),
                    ImagePath = table.Column<string>(type: "TEXT", nullable: true),
                    IssueDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ReviewedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ReviewNote = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.PrescriptionId);
                    table.CheckConstraint("CK_Prescription_PrescriptionRules", "Status IN ('PendingReview','Approved','Rejected','Cancelled') AND length(trim(PatientId)) > 0 AND length(trim(PatientName)) > 0 AND (IssueDate IS NULL OR ValidUntil IS NULL OR IssueDate <= ValidUntil) AND (Status <> 'Approved' OR (IssueDate IS NOT NULL AND ValidUntil IS NOT NULL AND PrescriberName IS NOT NULL AND length(trim(PrescriberName)) > 0))");
                    table.ForeignKey(
                        name: "FK_Prescriptions_UserAccounts_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prescriptions_UserAccounts_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prescriptions_UserAccounts_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    OrderId = table.Column<string>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    SaleKind = table.Column<string>(type: "TEXT", nullable: false),
                    ReceiverName = table.Column<string>(type: "TEXT", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: false),
                    ReceiveMethod = table.Column<string>(type: "TEXT", nullable: false),
                    Address = table.Column<string>(type: "TEXT", nullable: true),
                    PrescriptionId = table.Column<string>(type: "TEXT", nullable: true),
                    PatientId = table.Column<string>(type: "TEXT", nullable: true),
                    HandledByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Note = table.Column<string>(type: "TEXT", nullable: true),
                    Version = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.OrderId);
                    table.CheckConstraint("CK_Order_OrderRules", "SaleKind IN ('OTC','Prescription') AND ReceiveMethod IN ('Pickup','Delivery') AND Status IN ('WaitingReview','AwaitingPayment','Preparing','Delivering','Completed','Cancelled','Rejected') AND length(trim(ReceiverName)) > 0 AND length(trim(Phone)) > 0 AND (ReceiveMethod <> 'Delivery' OR (Address IS NOT NULL AND length(trim(Address)) > 0)) AND (SaleKind <> 'Prescription' OR (PrescriptionId IS NOT NULL AND PatientId IS NOT NULL)) AND CAST(TotalAmount AS REAL) >= 0 AND CAST(TotalAmount AS REAL) = CAST(TotalAmount AS INTEGER)");
                    table.ForeignKey(
                        name: "FK_Orders_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "Prescriptions",
                        principalColumn: "PrescriptionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_UserAccounts_HandledByUserId",
                        column: x => x.HandledByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_UserAccounts_UserId",
                        column: x => x.UserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PrescriptionItems",
                columns: table => new
                {
                    ItemId = table.Column<string>(type: "TEXT", nullable: false),
                    PrescriptionId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    PrescribedQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    DispensedQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescriptionItems", x => x.ItemId);
                    table.CheckConstraint("CK_PrescriptionItem_PrescriptionQuantity", "PrescribedQuantity > 0 AND DispensedQuantity >= 0 AND DispensedQuantity <= PrescribedQuantity");
                    table.ForeignKey(
                        name: "FK_PrescriptionItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PrescriptionItems_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "Prescriptions",
                        principalColumn: "PrescriptionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    OrderItemId = table.Column<string>(type: "TEXT", nullable: false),
                    OrderId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugName = table.Column<string>(type: "TEXT", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    LineTotal = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.OrderItemId);
                    table.CheckConstraint("CK_OrderItem_Money", "Quantity > 0 AND CAST(UnitPrice AS REAL) > 0 AND CAST(UnitPrice AS REAL) = CAST(UnitPrice AS INTEGER) AND CAST(LineTotal AS REAL) = Quantity * CAST(UnitPrice AS REAL)");
                    table.ForeignKey(
                        name: "FK_OrderItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    PaymentId = table.Column<string>(type: "TEXT", nullable: false),
                    OrderId = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    ReceivedAmount = table.Column<decimal>(type: "TEXT", nullable: true),
                    BankReference = table.Column<string>(type: "TEXT", nullable: true),
                    BankName = table.Column<string>(type: "TEXT", nullable: false),
                    AccountNumber = table.Column<string>(type: "TEXT", nullable: false),
                    AccountName = table.Column<string>(type: "TEXT", nullable: false),
                    QrImagePath = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ApprovedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    ApprovedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ReviewNote = table.Column<string>(type: "TEXT", nullable: true),
                    Version = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.PaymentId);
                    table.CheckConstraint("CK_Payment_PaymentRules", "CAST(ExpectedAmount AS REAL) > 0 AND CAST(ExpectedAmount AS REAL) = CAST(ExpectedAmount AS INTEGER) AND (ReceivedAmount IS NULL OR (CAST(ReceivedAmount AS REAL) >= 0 AND CAST(ReceivedAmount AS REAL) = CAST(ReceivedAmount AS INTEGER))) AND (Status <> 'Confirmed' OR (BankReference IS NOT NULL AND ApprovedByUserId IS NOT NULL AND ApprovedAt IS NOT NULL AND CAST(ReceivedAmount AS REAL) >= CAST(ExpectedAmount AS REAL)))");
                    table.CheckConstraint("CK_Payment_PaymentStatus", "Status IN ('PendingReview','Confirmed','Closed') AND length(trim(BankName)) > 0 AND length(trim(AccountNumber)) > 0 AND length(trim(AccountName)) > 0 AND length(trim(QrImagePath)) > 0");
                    table.ForeignKey(
                        name: "FK_Payments_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_UserAccounts_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales",
                columns: table => new
                {
                    SaleId = table.Column<string>(type: "TEXT", nullable: false),
                    Channel = table.Column<string>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    BuyerUserId = table.Column<string>(type: "TEXT", nullable: true),
                    OrderId = table.Column<string>(type: "TEXT", nullable: true),
                    PrescriptionId = table.Column<string>(type: "TEXT", nullable: true),
                    PatientId = table.Column<string>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentMethod = table.Column<string>(type: "TEXT", nullable: true),
                    Version = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales", x => x.SaleId);
                    table.CheckConstraint("CK_Sale_SaleRules", "Kind IN ('OTC','Prescription') AND Channel IN ('Counter','Online') AND Status IN ('Draft','Completed','Cancelled') AND CAST(TotalAmount AS REAL) >= 0 AND CAST(TotalAmount AS REAL) = CAST(TotalAmount AS INTEGER) AND (Kind <> 'Prescription' OR (PrescriptionId IS NOT NULL AND PatientId IS NOT NULL)) AND (Status <> 'Completed' OR (CompletedAt IS NOT NULL AND PaymentMethod IS NOT NULL AND ((Channel='Counter' AND PaymentMethod='Cash') OR (Channel='Online' AND PaymentMethod='ManualQR'))))");
                    table.ForeignKey(
                        name: "FK_Sales_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "Prescriptions",
                        principalColumn: "PrescriptionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_UserAccounts_BuyerUserId",
                        column: x => x.BuyerUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_UserAccounts_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockReservations",
                columns: table => new
                {
                    ReservationId = table.Column<string>(type: "TEXT", nullable: false),
                    OrderId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    PrescriptionItemId = table.Column<string>(type: "TEXT", nullable: true),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockReservations", x => x.ReservationId);
                    table.CheckConstraint("CK_StockReservation_ReservationRules", "Quantity > 0 AND Status IN ('Active','Consumed','Released')");
                    table.ForeignKey(
                        name: "FK_StockReservations_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockReservations_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockReservations_PrescriptionItems_PrescriptionItemId",
                        column: x => x.PrescriptionItemId,
                        principalTable: "PrescriptionItems",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    InvoiceId = table.Column<string>(type: "TEXT", nullable: false),
                    SaleId = table.Column<string>(type: "TEXT", nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.InvoiceId);
                    table.ForeignKey(
                        name: "FK_Invoices_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "SaleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SaleItems",
                columns: table => new
                {
                    SaleItemId = table.Column<string>(type: "TEXT", nullable: false),
                    SaleId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugId = table.Column<string>(type: "TEXT", nullable: false),
                    DrugName = table.Column<string>(type: "TEXT", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    LineTotal = table.Column<decimal>(type: "TEXT", nullable: false),
                    IsSealed = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleItems", x => x.SaleItemId);
                    table.CheckConstraint("CK_SaleItem_Money", "Quantity > 0 AND CAST(UnitPrice AS REAL) > 0 AND CAST(UnitPrice AS REAL) = CAST(UnitPrice AS INTEGER) AND CAST(LineTotal AS REAL) = Quantity * CAST(UnitPrice AS REAL)");
                    table.ForeignKey(
                        name: "FK_SaleItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SaleItems_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "SaleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BatchAllocations",
                columns: table => new
                {
                    AllocationId = table.Column<string>(type: "TEXT", nullable: false),
                    SaleItemId = table.Column<string>(type: "TEXT", nullable: false),
                    BatchId = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BatchAllocations", x => x.AllocationId);
                    table.CheckConstraint("CK_BatchAllocation_AllocationQuantity", "Quantity > 0");
                    table.ForeignKey(
                        name: "FK_BatchAllocations_DrugBatches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "DrugBatches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BatchAllocations_SaleItems_SaleItemId",
                        column: x => x.SaleItemId,
                        principalTable: "SaleItems",
                        principalColumn: "SaleItemId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BatchAllocations_BatchId",
                table: "BatchAllocations",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_BatchAllocations_SaleItemId",
                table: "BatchAllocations",
                column: "SaleItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_DrugId",
                table: "CartItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_DrugBatches_DrugId_BatchNumber",
                table: "DrugBatches",
                columns: new[] { "DrugId", "BatchNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_SaleId",
                table: "Invoices",
                column: "SaleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_DrugId",
                table: "OrderItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId_DrugId",
                table: "OrderItems",
                columns: new[] { "OrderId", "DrugId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_HandledByUserId",
                table: "Orders",
                column: "HandledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PrescriptionId",
                table: "Orders",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                table: "Orders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ApprovedByUserId",
                table: "Payments",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BankReference",
                table: "Payments",
                column: "BankReference",
                unique: true,
                filter: "\"Status\" = 'Confirmed'");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_OrderId",
                table: "Payments",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionItems_DrugId",
                table: "PrescriptionItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionItems_PrescriptionId_DrugId",
                table: "PrescriptionItems",
                columns: new[] { "PrescriptionId", "DrugId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_CreatedByUserId",
                table: "Prescriptions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_OwnerUserId",
                table: "Prescriptions",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_ReviewedByUserId",
                table: "Prescriptions",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_DrugId",
                table: "SaleItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_SaleId_DrugId",
                table: "SaleItems",
                columns: new[] { "SaleId", "DrugId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_BuyerUserId",
                table: "Sales",
                column: "BuyerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_CreatedByUserId",
                table: "Sales",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_OrderId",
                table: "Sales",
                column: "OrderId",
                unique: true,
                filter: "\"Status\" = 'Completed' AND \"OrderId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_PrescriptionId",
                table: "Sales",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_StockReservations_DrugId",
                table: "StockReservations",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_StockReservations_OrderId_DrugId",
                table: "StockReservations",
                columns: new[] { "OrderId", "DrugId" },
                unique: true,
                filter: "\"Status\" = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_StockReservations_PrescriptionItemId",
                table: "StockReservations",
                column: "PrescriptionItemId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_NormalizedUsername",
                table: "UserAccounts",
                column: "NormalizedUsername",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BatchAllocations");

            migrationBuilder.DropTable(
                name: "CartItems");

            migrationBuilder.DropTable(
                name: "DailySequence");

            migrationBuilder.DropTable(
                name: "Invoices");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "PaymentSettings");

            migrationBuilder.DropTable(
                name: "StockReservations");

            migrationBuilder.DropTable(
                name: "DrugBatches");

            migrationBuilder.DropTable(
                name: "SaleItems");

            migrationBuilder.DropTable(
                name: "PrescriptionItems");

            migrationBuilder.DropTable(
                name: "Sales");

            migrationBuilder.DropTable(
                name: "Drugs");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Prescriptions");

            migrationBuilder.DropTable(
                name: "UserAccounts");
        }
    }
}
