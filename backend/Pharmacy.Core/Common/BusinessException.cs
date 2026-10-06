namespace Pharmacy.Core.Common;

public sealed class BusinessException(string code, string message, string? field = null, object? data = null) : Exception(message)
{
    public string Code { get; } = code;
    public string? Field { get; } = field;
    public object? Details { get; } = data;
}

public static class Guard
{
    public static string Required(string value) => string.IsNullOrWhiteSpace(value)
        ? throw new BusinessException("VALIDATION_FAILED", "Thông tin bắt buộc không được để trống.") : value.Trim();
    public static int Positive(int value) => value > 0 ? value : throw new BusinessException("VALIDATION_FAILED", "Số lượng phải dương.");
    public static decimal Money(decimal value) => value > 0 && decimal.Truncate(value) == value ? value
        : throw new BusinessException("VALIDATION_FAILED", "Giá phải là số nguyên VND dương.");
    public static void State(bool valid) { if (!valid) throw new BusinessException("INVALID_STATE", "Trạng thái không hợp lệ."); }
}
