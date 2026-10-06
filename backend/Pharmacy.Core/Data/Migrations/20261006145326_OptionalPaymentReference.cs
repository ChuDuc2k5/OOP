using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pharmacy.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class OptionalPaymentReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Payment_PaymentRules",
                table: "Payments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payment_PaymentRules",
                table: "Payments",
                sql: "CAST(ExpectedAmount AS REAL) > 0 AND CAST(ExpectedAmount AS REAL) = CAST(ExpectedAmount AS INTEGER) AND (ReceivedAmount IS NULL OR (CAST(ReceivedAmount AS REAL) >= 0 AND CAST(ReceivedAmount AS REAL) = CAST(ReceivedAmount AS INTEGER))) AND (Status <> 'Confirmed' OR (ApprovedByUserId IS NOT NULL AND ApprovedAt IS NOT NULL AND CAST(ReceivedAmount AS REAL) >= CAST(ExpectedAmount AS REAL)))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Payment_PaymentRules",
                table: "Payments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payment_PaymentRules",
                table: "Payments",
                sql: "CAST(ExpectedAmount AS REAL) > 0 AND CAST(ExpectedAmount AS REAL) = CAST(ExpectedAmount AS INTEGER) AND (ReceivedAmount IS NULL OR (CAST(ReceivedAmount AS REAL) >= 0 AND CAST(ReceivedAmount AS REAL) = CAST(ReceivedAmount AS INTEGER))) AND (Status <> 'Confirmed' OR (BankReference IS NOT NULL AND ApprovedByUserId IS NOT NULL AND ApprovedAt IS NOT NULL AND CAST(ReceivedAmount AS REAL) >= CAST(ExpectedAmount AS REAL)))");
        }
    }
}
