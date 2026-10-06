using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Pharmacy.Core.Data.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "pharmacy");

            migrationBuilder.CreateTable(
                name: "DailySequence",
                schema: "pharmacy",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailySequence", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "Drugs",
                schema: "pharmacy",
                columns: table => new
                {
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ImagePath = table.Column<string>(type: "text", nullable: true),
                    SaleUnit = table.Column<string>(type: "text", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    LowStockThreshold = table.Column<int>(type: "integer", nullable: false),
                    RequiresPrescription = table.Column<bool>(type: "boolean", nullable: false),
                    IsControlled = table.Column<bool>(type: "boolean", nullable: false),
                    IsForSale = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Drugs", x => x.DrugId);
                    table.CheckConstraint("CK_Drug_DrugRules", "length(trim(\"Name\")) > 0 AND length(trim(\"SaleUnit\")) > 0 AND \"UnitPrice\" > 0 AND \"UnitPrice\" = trunc(\"UnitPrice\") AND \"LowStockThreshold\" >= 0 AND (\"IsControlled\" = FALSE OR \"RequiresPrescription\" = TRUE)");
                });

            migrationBuilder.CreateTable(
                name: "PaymentSettings",
                schema: "pharmacy",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BankName = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "text", nullable: false),
                    AccountName = table.Column<string>(type: "text", nullable: false),
                    QrImagePath = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentSettings", x => x.Id);
                    table.CheckConstraint("CK_PaymentSetting_Singleton", "\"Id\" = 1");
                });

            migrationBuilder.CreateTable(
                name: "UserAccounts",
                schema: "pharmacy",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Username = table.Column<string>(type: "text", nullable: false),
                    NormalizedUsername = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAccounts", x => x.UserId);
                    table.CheckConstraint("CK_UserAccount_AccountRules", "length(\"Username\") BETWEEN 3 AND 30 AND \"Username\" ~ '^[A-Za-z0-9._-]+$' AND length(\"PasswordHash\") > 0 AND \"NormalizedUsername\" = upper(trim(\"Username\")) AND \"Role\" IN ('User','Staff','Admin')");
                });

            migrationBuilder.CreateTable(
                name: "DrugBatches",
                schema: "pharmacy",
                columns: table => new
                {
                    BatchId = table.Column<string>(type: "text", nullable: false),
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    BatchNumber = table.Column<string>(type: "text", nullable: false),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: false),
                    InitialQuantity = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DrugBatches", x => x.BatchId);
                    table.CheckConstraint("CK_DrugBatch_BatchQuantity", "\"InitialQuantity\" > 0 AND \"Quantity\" >= 0 AND \"Quantity\" <= \"InitialQuantity\" AND length(trim(\"BatchNumber\")) > 0");
                    table.ForeignKey(
                        name: "FK_DrugBatches_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalSchema: "pharmacy",
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CartItems",
                schema: "pharmacy",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItems", x => new { x.UserId, x.DrugId });
                    table.CheckConstraint("CK_CartItem_CartQuantity", "\"Quantity\" > 0");
                    table.ForeignKey(
                        name: "FK_CartItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalSchema: "pharmacy",
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CartItems_UserAccounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Prescriptions",
                schema: "pharmacy",
                columns: table => new
                {
                    PrescriptionId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OwnerUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    PatientId = table.Column<string>(type: "text", nullable: false),
                    PatientName = table.Column<string>(type: "text", nullable: false),
                    PrescriberName = table.Column<string>(type: "text", nullable: true),
                    ImagePath = table.Column<string>(type: "text", nullable: true),
                    IssueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReviewedByUserId = table.Column<string>(type: "text", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.PrescriptionId);
                    table.CheckConstraint("CK_Prescription_PrescriptionRules", "\"Status\" IN ('PendingReview','Approved','Rejected','Cancelled') AND length(trim(\"PatientId\")) > 0 AND length(trim(\"PatientName\")) > 0 AND (\"IssueDate\" IS NULL OR \"ValidUntil\" IS NULL OR \"IssueDate\" <= \"ValidUntil\") AND (\"Status\" <> 'Approved' OR (\"IssueDate\" IS NOT NULL AND \"ValidUntil\" IS NOT NULL AND \"PrescriberName\" IS NOT NULL AND length(trim(\"PrescriberName\")) > 0))");
                    table.ForeignKey(
                        name: "FK_Prescriptions_UserAccounts_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prescriptions_UserAccounts_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prescriptions_UserAccounts_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                schema: "pharmacy",
                columns: table => new
                {
                    OrderId = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SaleKind = table.Column<string>(type: "text", nullable: false),
                    ReceiverName = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    ReceiveMethod = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: true),
                    PrescriptionId = table.Column<string>(type: "text", nullable: true),
                    PatientId = table.Column<string>(type: "text", nullable: true),
                    HandledByUserId = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.OrderId);
                    table.CheckConstraint("CK_Order_OrderRules", "\"SaleKind\" IN ('OTC','Prescription') AND \"ReceiveMethod\" IN ('Pickup','Delivery') AND \"Status\" IN ('WaitingReview','AwaitingPayment','Preparing','Delivering','Completed','Cancelled','Rejected') AND length(trim(\"ReceiverName\")) > 0 AND length(trim(\"Phone\")) > 0 AND (\"ReceiveMethod\" <> 'Delivery' OR (\"Address\" IS NOT NULL AND length(trim(\"Address\")) > 0)) AND (\"SaleKind\" <> 'Prescription' OR (\"PrescriptionId\" IS NOT NULL AND \"PatientId\" IS NOT NULL)) AND \"TotalAmount\" >= 0 AND \"TotalAmount\" = trunc(\"TotalAmount\")");
                    table.ForeignKey(
                        name: "FK_Orders_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalSchema: "pharmacy",
                        principalTable: "Prescriptions",
                        principalColumn: "PrescriptionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_UserAccounts_HandledByUserId",
                        column: x => x.HandledByUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_UserAccounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PrescriptionItems",
                schema: "pharmacy",
                columns: table => new
                {
                    ItemId = table.Column<string>(type: "text", nullable: false),
                    PrescriptionId = table.Column<string>(type: "text", nullable: false),
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    PrescribedQuantity = table.Column<int>(type: "integer", nullable: false),
                    DispensedQuantity = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescriptionItems", x => x.ItemId);
                    table.CheckConstraint("CK_PrescriptionItem_PrescriptionQuantity", "\"PrescribedQuantity\" > 0 AND \"DispensedQuantity\" >= 0 AND \"DispensedQuantity\" <= \"PrescribedQuantity\"");
                    table.ForeignKey(
                        name: "FK_PrescriptionItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalSchema: "pharmacy",
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PrescriptionItems_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalSchema: "pharmacy",
                        principalTable: "Prescriptions",
                        principalColumn: "PrescriptionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                schema: "pharmacy",
                columns: table => new
                {
                    OrderItemId = table.Column<string>(type: "text", nullable: false),
                    OrderId = table.Column<string>(type: "text", nullable: false),
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    DrugName = table.Column<string>(type: "text", nullable: false),
                    Unit = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.OrderItemId);
                    table.CheckConstraint("CK_OrderItem_Money", "\"Quantity\" > 0 AND \"UnitPrice\" > 0 AND \"UnitPrice\" = trunc(\"UnitPrice\") AND \"LineTotal\" = \"Quantity\" * \"UnitPrice\"");
                    table.ForeignKey(
                        name: "FK_OrderItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalSchema: "pharmacy",
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "pharmacy",
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                schema: "pharmacy",
                columns: table => new
                {
                    PaymentId = table.Column<string>(type: "text", nullable: false),
                    OrderId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceivedAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    BankReference = table.Column<string>(type: "text", nullable: true),
                    BankName = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "text", nullable: false),
                    AccountName = table.Column<string>(type: "text", nullable: false),
                    QrImagePath = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ApprovedByUserId = table.Column<string>(type: "text", nullable: true),
                    ApprovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.PaymentId);
                    table.CheckConstraint("CK_Payment_PaymentRules", "\"ExpectedAmount\" > 0 AND \"ExpectedAmount\" = trunc(\"ExpectedAmount\") AND (\"ReceivedAmount\" IS NULL OR (\"ReceivedAmount\" >= 0 AND \"ReceivedAmount\" = trunc(\"ReceivedAmount\"))) AND (\"Status\" <> 'Confirmed' OR (\"BankReference\" IS NOT NULL AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL AND \"ReceivedAmount\" >= \"ExpectedAmount\"))");
                    table.CheckConstraint("CK_Payment_PaymentStatus", "\"Status\" IN ('PendingReview','Confirmed','Closed') AND length(trim(\"BankName\")) > 0 AND length(trim(\"AccountNumber\")) > 0 AND length(trim(\"AccountName\")) > 0 AND length(trim(\"QrImagePath\")) > 0");
                    table.ForeignKey(
                        name: "FK_Payments_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "pharmacy",
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_UserAccounts_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sales",
                schema: "pharmacy",
                columns: table => new
                {
                    SaleId = table.Column<string>(type: "text", nullable: false),
                    Channel = table.Column<string>(type: "text", nullable: false),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    BuyerUserId = table.Column<string>(type: "text", nullable: true),
                    OrderId = table.Column<string>(type: "text", nullable: true),
                    PrescriptionId = table.Column<string>(type: "text", nullable: true),
                    PatientId = table.Column<string>(type: "text", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMethod = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales", x => x.SaleId);
                    table.CheckConstraint("CK_Sale_SaleRules", "\"Kind\" IN ('OTC','Prescription') AND \"Channel\" IN ('Counter','Online') AND \"Status\" IN ('Draft','Completed','Cancelled') AND \"TotalAmount\" >= 0 AND \"TotalAmount\" = trunc(\"TotalAmount\") AND (\"Kind\" <> 'Prescription' OR (\"PrescriptionId\" IS NOT NULL AND \"PatientId\" IS NOT NULL)) AND (\"Status\" <> 'Completed' OR (\"CompletedAt\" IS NOT NULL AND \"PaymentMethod\" IS NOT NULL AND ((\"Channel\"='Counter' AND \"PaymentMethod\"='Cash') OR (\"Channel\"='Online' AND \"PaymentMethod\"='ManualQR'))))");
                    table.ForeignKey(
                        name: "FK_Sales_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "pharmacy",
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalSchema: "pharmacy",
                        principalTable: "Prescriptions",
                        principalColumn: "PrescriptionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_UserAccounts_BuyerUserId",
                        column: x => x.BuyerUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sales_UserAccounts_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalSchema: "pharmacy",
                        principalTable: "UserAccounts",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockReservations",
                schema: "pharmacy",
                columns: table => new
                {
                    ReservationId = table.Column<string>(type: "text", nullable: false),
                    OrderId = table.Column<string>(type: "text", nullable: false),
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    PrescriptionItemId = table.Column<string>(type: "text", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockReservations", x => x.ReservationId);
                    table.CheckConstraint("CK_StockReservation_ReservationRules", "\"Quantity\" > 0 AND \"Status\" IN ('Active','Consumed','Released')");
                    table.ForeignKey(
                        name: "FK_StockReservations_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalSchema: "pharmacy",
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockReservations_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "pharmacy",
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockReservations_PrescriptionItems_PrescriptionItemId",
                        column: x => x.PrescriptionItemId,
                        principalSchema: "pharmacy",
                        principalTable: "PrescriptionItems",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                schema: "pharmacy",
                columns: table => new
                {
                    InvoiceId = table.Column<string>(type: "text", nullable: false),
                    SaleId = table.Column<string>(type: "text", nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.InvoiceId);
                    table.ForeignKey(
                        name: "FK_Invoices_Sales_SaleId",
                        column: x => x.SaleId,
                        principalSchema: "pharmacy",
                        principalTable: "Sales",
                        principalColumn: "SaleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SaleItems",
                schema: "pharmacy",
                columns: table => new
                {
                    SaleItemId = table.Column<string>(type: "text", nullable: false),
                    SaleId = table.Column<string>(type: "text", nullable: false),
                    DrugId = table.Column<string>(type: "text", nullable: false),
                    DrugName = table.Column<string>(type: "text", nullable: false),
                    Unit = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    IsSealed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleItems", x => x.SaleItemId);
                    table.CheckConstraint("CK_SaleItem_Money", "\"Quantity\" > 0 AND \"UnitPrice\" > 0 AND \"UnitPrice\" = trunc(\"UnitPrice\") AND \"LineTotal\" = \"Quantity\" * \"UnitPrice\"");
                    table.ForeignKey(
                        name: "FK_SaleItems_Drugs_DrugId",
                        column: x => x.DrugId,
                        principalSchema: "pharmacy",
                        principalTable: "Drugs",
                        principalColumn: "DrugId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SaleItems_Sales_SaleId",
                        column: x => x.SaleId,
                        principalSchema: "pharmacy",
                        principalTable: "Sales",
                        principalColumn: "SaleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BatchAllocations",
                schema: "pharmacy",
                columns: table => new
                {
                    AllocationId = table.Column<string>(type: "text", nullable: false),
                    SaleItemId = table.Column<string>(type: "text", nullable: false),
                    BatchId = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BatchAllocations", x => x.AllocationId);
                    table.CheckConstraint("CK_BatchAllocation_AllocationQuantity", "\"Quantity\" > 0");
                    table.ForeignKey(
                        name: "FK_BatchAllocations_DrugBatches_BatchId",
                        column: x => x.BatchId,
                        principalSchema: "pharmacy",
                        principalTable: "DrugBatches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BatchAllocations_SaleItems_SaleItemId",
                        column: x => x.SaleItemId,
                        principalSchema: "pharmacy",
                        principalTable: "SaleItems",
                        principalColumn: "SaleItemId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BatchAllocations_BatchId",
                schema: "pharmacy",
                table: "BatchAllocations",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_BatchAllocations_SaleItemId",
                schema: "pharmacy",
                table: "BatchAllocations",
                column: "SaleItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_DrugId",
                schema: "pharmacy",
                table: "CartItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_DrugBatches_DrugId_BatchNumber",
                schema: "pharmacy",
                table: "DrugBatches",
                columns: new[] { "DrugId", "BatchNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_SaleId",
                schema: "pharmacy",
                table: "Invoices",
                column: "SaleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_DrugId",
                schema: "pharmacy",
                table: "OrderItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId_DrugId",
                schema: "pharmacy",
                table: "OrderItems",
                columns: new[] { "OrderId", "DrugId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_HandledByUserId",
                schema: "pharmacy",
                table: "Orders",
                column: "HandledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PrescriptionId",
                schema: "pharmacy",
                table: "Orders",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                schema: "pharmacy",
                table: "Orders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ApprovedByUserId",
                schema: "pharmacy",
                table: "Payments",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BankReference",
                schema: "pharmacy",
                table: "Payments",
                column: "BankReference",
                unique: true,
                filter: "\"Status\" = 'Confirmed'");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_OrderId",
                schema: "pharmacy",
                table: "Payments",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionItems_DrugId",
                schema: "pharmacy",
                table: "PrescriptionItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionItems_PrescriptionId_DrugId",
                schema: "pharmacy",
                table: "PrescriptionItems",
                columns: new[] { "PrescriptionId", "DrugId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_CreatedByUserId",
                schema: "pharmacy",
                table: "Prescriptions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_OwnerUserId",
                schema: "pharmacy",
                table: "Prescriptions",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_ReviewedByUserId",
                schema: "pharmacy",
                table: "Prescriptions",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_DrugId",
                schema: "pharmacy",
                table: "SaleItems",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_SaleId_DrugId",
                schema: "pharmacy",
                table: "SaleItems",
                columns: new[] { "SaleId", "DrugId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_BuyerUserId",
                schema: "pharmacy",
                table: "Sales",
                column: "BuyerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_CreatedByUserId",
                schema: "pharmacy",
                table: "Sales",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_OrderId",
                schema: "pharmacy",
                table: "Sales",
                column: "OrderId",
                unique: true,
                filter: "\"Status\" = 'Completed' AND \"OrderId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_PrescriptionId",
                schema: "pharmacy",
                table: "Sales",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_StockReservations_DrugId",
                schema: "pharmacy",
                table: "StockReservations",
                column: "DrugId");

            migrationBuilder.CreateIndex(
                name: "IX_StockReservations_OrderId_DrugId",
                schema: "pharmacy",
                table: "StockReservations",
                columns: new[] { "OrderId", "DrugId" },
                unique: true,
                filter: "\"Status\" = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_StockReservations_PrescriptionItemId",
                schema: "pharmacy",
                table: "StockReservations",
                column: "PrescriptionItemId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_NormalizedUsername",
                schema: "pharmacy",
                table: "UserAccounts",
                column: "NormalizedUsername",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BatchAllocations",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "CartItems",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "DailySequence",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "Invoices",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "OrderItems",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "Payments",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "PaymentSettings",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "StockReservations",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "DrugBatches",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "SaleItems",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "PrescriptionItems",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "Sales",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "Drugs",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "Orders",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "Prescriptions",
                schema: "pharmacy");

            migrationBuilder.DropTable(
                name: "UserAccounts",
                schema: "pharmacy");
        }
    }
}
