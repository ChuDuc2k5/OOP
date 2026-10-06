using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pharmacy.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class PrescriptionCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "Prescriptions",
                type: "TEXT",
                nullable: false,
                defaultValue: DateTimeOffset.UnixEpoch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Prescriptions");
        }
    }
}
