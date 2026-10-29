using Pharmacy.Core.Domain;
using Pharmacy.Week4Demo;

var date = new DateOnly(2026, 10, 29);
var now = new DateTimeOffset(2026, 10, 29, 9, 0, 0, TimeSpan.FromHours(7));
var drugs = new Dictionary<string, Drug>
{
    ["OTC"] = new("OTC", "Ordinary OTC drug", "unit", 2500, 2),
    ["RX"] = new("RX", "Prescription drug", "unit", 5000, 2, requiresPrescription: true),
    ["CTRL"] = new("CTRL", "Controlled drug", "unit", 5000, 2, requiresPrescription: true, controlled: true)
};
var prescription = new Prescription("RX-DEMO", "BUYER", "STAFF", "PATIENT", "Demo patient");
prescription.SetDetails("Prescriber", date, date.AddDays(1), [new("RX-ITEM", "RX-DEMO", "RX", 4)]);
prescription.Approve("STAFF", now);
var context = new SaleContext(date, drugs, prescription);

Sale WithLine(Sale sale, string drugId, int quantity)
{
    sale.ReplaceItems([new(sale.SaleId + "-ITEM", sale.SaleId, drugId, drugs[drugId].Name,
        "unit", quantity, drugs[drugId].UnitPrice)]);
    return sale;
}

var cases = new (string Name, Sale Sale, bool Valid, string? Code)[]
{
    ("existing OTC: 3 units", WithLine(new OTCSale("OTC-1", "STAFF", now), "OTC", 3), true, null),
    ("new limited OTC: 2 of 2", WithLine(new QuantityLimitedOTCSale("LIMIT-1", "STAFF", now, 2), "OTC", 2), true, null),
    ("new limited OTC: 3 of 2", WithLine(new QuantityLimitedOTCSale("LIMIT-2", "STAFF", now, 2), "OTC", 3), false, "PURCHASE_LIMIT_EXCEEDED"),
    ("new limited OTC: RX rejected", WithLine(new QuantityLimitedOTCSale("LIMIT-3", "STAFF", now, 2), "RX", 1), false, "PRESCRIPTION_REQUIRED"),
    ("new limited OTC: controlled rejected", WithLine(new QuantityLimitedOTCSale("LIMIT-4", "STAFF", now, 2), "CTRL", 1), false, "PRESCRIPTION_REQUIRED"),
    ("existing prescription sale", WithLine(new PrescriptionSale("RX-1", "STAFF", now, "RX-DEMO", "PATIENT"), "RX", 1), true, null)
};

var failed = 0;
foreach (var sample in cases)
{
    var result = SaleValidationRunner.Evaluate(sample.Sale, context);
    var passed = result.IsValid == sample.Valid && result.Code == sample.Code;
    Console.WriteLine($"{(passed ? "PASS" : "FAIL")} | {sample.Name} | {sample.Sale.GetType().Name} | valid={result.IsValid} | code={result.Code ?? "NONE"}");
    if (!passed)
    {
        failed++;
    }
}

Console.WriteLine($"Summary: {cases.Length - failed} passed / {failed} failed; domain validation only, no database or production checkout.");
return failed == 0 ? 0 : 1;
