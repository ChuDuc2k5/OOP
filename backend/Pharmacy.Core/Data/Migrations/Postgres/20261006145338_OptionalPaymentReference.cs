using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pharmacy.Core.Data.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class OptionalPaymentReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Payment_PaymentRules",
                schema: "pharmacy",
                table: "Payments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payment_PaymentRules",
                schema: "pharmacy",
                table: "Payments",
                sql: "\"ExpectedAmount\" > 0 AND \"ExpectedAmount\" = trunc(\"ExpectedAmount\") AND (\"ReceivedAmount\" IS NULL OR (\"ReceivedAmount\" >= 0 AND \"ReceivedAmount\" = trunc(\"ReceivedAmount\"))) AND (\"Status\" <> 'Confirmed' OR (\"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL AND \"ReceivedAmount\" >= \"ExpectedAmount\"))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Payment_PaymentRules",
                schema: "pharmacy",
                table: "Payments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payment_PaymentRules",
                schema: "pharmacy",
                table: "Payments",
                sql: "\"ExpectedAmount\" > 0 AND \"ExpectedAmount\" = trunc(\"ExpectedAmount\") AND (\"ReceivedAmount\" IS NULL OR (\"ReceivedAmount\" >= 0 AND \"ReceivedAmount\" = trunc(\"ReceivedAmount\"))) AND (\"Status\" <> 'Confirmed' OR (\"BankReference\" IS NOT NULL AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL AND \"ReceivedAmount\" >= \"ExpectedAmount\"))");
        }
    }
}
