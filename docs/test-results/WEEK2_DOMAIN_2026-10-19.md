# Kết quả kiểm thử domain và nghiệp vụ tuần 2

- Ngày chạy: 19/10/2026 (UTC+07:00).
- Bắt đầu: 2026-10-19T09:36:38.9949830+07:00; kết thúc: 2026-10-19T09:37:36.3212076+07:00.
- Cấu hình: Release, .NET 10, SQLite test riêng qua WebApplicationFactory.
- Kết quả: **84 Pass / 0 Fail / 0 Skip**.
- Thời lượng test do VSTest báo: khoảng 50 giây; thời gian trên gồm khởi tạo runner.
- Dữ liệu được trích trực tiếp từ file TRX của lượt chạy này.
- SHA-256 TRX gốc: `7b8e4b2dba73b5b80be699aaa2a460f41399603a92b7e4349258b1d71c419061`.

## Lệnh thực hiện

```powershell
dotnet test backend/Pharmacy.Tests/Pharmacy.Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~FefoDomainTests|FullyQualifiedName~InventoryTests|FullyQualifiedName~OrderingTests|FullyQualifiedName~FoundationTests" --logger "trx;LogFileName=week2-domain.trx" --results-directory .report-work/test-results --verbosity minimal
```

## Danh sách kết quả

| Test | Kết quả |
|---|---|
| `FefoDomainTests.TC18_DomainFefo_SplitsBatches_AndBreaksTiesByBatchNumber` | Passed |
| `FefoDomainTests.TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted(days: 0, allowed: False)` | Passed |
| `FefoDomainTests.TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted(days: 1, allowed: True)` | Passed |
| `FefoDomainTests.TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted(days: 30, allowed: True)` | Passed |
| `FefoDomainTests.TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted(days: 31, allowed: True)` | Passed |
| `FoundationTests.Domain_ProtectsStockQuotaReservationsAndReadOnlyCollections` | Passed |
| `FoundationTests.FileStorage_ValidatesMagicSizeMimeExtensionAndTraversal` | Passed |
| `FoundationTests.IdGenerator_IsAtomicPersistentAndUsesBusinessDate` | Passed |
| `FoundationTests.SaleValidation_DispatchesThroughAbstractBaseType` | Passed |
| `FoundationTests.Sqlite_EnforcesUniquePartialIndexesForeignKeysAndChecks` | Passed |
| `FoundationTests.Versions_RejectStaleWrites_FromSeparateContexts` | Passed |
| `InventoryTests.TC14_AddValidBatch_IncreasesStock_AndReturnsContractDto` | Passed |
| `InventoryTests.TC15_DuplicateBatch_IsRejected_AndUniquenessIsPerDrug` | Passed |
| `InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(expiryDate: "2026-10-05", quantity: "1", field: "expiryDate")` | Passed |
| `InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(expiryDate: "2026-10-06", quantity: "1", field: "expiryDate")` | Passed |
| `InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(expiryDate: "2026-11-01", quantity: "-1", field: "quantity")` | Passed |
| `InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(expiryDate: "2026-11-01", quantity: "0", field: "quantity")` | Passed |
| `InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(expiryDate: "2026-11-01", quantity: "1.5", field: "quantity")` | Passed |
| `InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(expiryDate: "bad-date", quantity: "1", field: "expiryDate")` | Passed |
| `InventoryTests.TC16_ConcurrentReserve_LastStockIsNotOverbooked` | Passed |
| `InventoryTests.TC16_InventoryCountsExpiryAndReservations_ReleaseDoesNotDeductStock` | Passed |
| `InventoryTests.TC16_PrescriptionReservations_ProtectQuota_AndReleaseBothLimits` | Passed |
| `InventoryTests.TC17_GuestAndUser_CannotReadInventoryOrReports(login: False, status: 401, code: "UNAUTHENTICATED")` | Passed |
| `InventoryTests.TC17_GuestAndUser_CannotReadInventoryOrReports(login: True, status: 403, code: "FORBIDDEN")` | Passed |
| `InventoryTests.TC18_ConcurrentDeduct_RefreshesStaleContexts_AndNeverOverdraws` | Passed |
| `InventoryTests.TC18_ReservedStock_IsProtectedAndConsumedOnlyByItsOrder` | Passed |
| `InventoryTests.TC18_ServiceDeduct_UsesFefo_MergesLines_AndRollsBackOnFailure` | Passed |
| `InventoryTests.TC19_ServiceDeduct_ExcludesD_UsesDPlusOne` | Passed |
| `InventoryTests.TC22_ExpiringReport_UsesOpenClosedDayWindow_AndDoesNotWrite` | Passed |
| `InventoryTests.TC23_LowStockReport_IncludesEqualityAndZero_ExcludesAboveThreshold` | Passed |
| `OrderingTests.TC13_OrderSnapshotsPrice_ChangedCartRequiresConfirmation` | Passed |
| `OrderingTests.TC21_CancelPrescriptionOrder_ReleasesStockQuotaAndClosesPaymentAtomically` | Passed |
| `OrderingTests.TC21_CancellationFailure_RollsBackOrderReservationAndPayment` | Passed |
| `OrderingTests.TC24_CounterDuplicateAndInvalidDetails_ReturnFieldErrorsWithoutWriting` | Passed |
| `OrderingTests.TC24_D12_CounterPrescriptionWithoutOrders_ReturnsEmptyLinkedOrders` | Passed |
| `OrderingTests.TC24_MigrationFromM1_PreservesExistingPrescriptionAndDoesNotReseed` | Passed |
| `OrderingTests.TC24_OnlineAndCounterPrescriptions_PersistOwnerCreatorTimeAndNoStockChange` | Passed |
| `OrderingTests.TC25_D12_LinkedOrders_StaffSeesSnapshotsAllStatusesInCreatedOrder_UserSeesEmpty(role: "admin")` | Passed |
| `OrderingTests.TC25_D12_LinkedOrders_StaffSeesSnapshotsAllStatusesInCreatedOrder_UserSeesEmpty(role: "staff")` | Passed |
| `OrderingTests.TC25_PrescriptionImages_RejectInvalidFilesAndHideOtherOwners` | Passed |
| `OrderingTests.TC26_DetailsMergeDuplicates_ApproveTransitionsEligibleLinkedOrders` | Passed |
| `OrderingTests.TC26_InvalidReviewAndDetails_DoNotPartiallyWrite` | Passed |
| `OrderingTests.TC26_RejectOrCancelPrescription_RejectsWaitingOrdersWithReason(action: "cancel", status: "Cancelled")` | Passed |
| `OrderingTests.TC26_RejectOrCancelPrescription_RejectsWaitingOrdersWithReason(action: "reject", status: "Rejected")` | Passed |
| `OrderingTests.TC27_ValidateQuota_RejectsInvalidPrescriptionCases(scenario: "expired")` | Passed |
| `OrderingTests.TC27_ValidateQuota_RejectsInvalidPrescriptionCases(scenario: "future")` | Passed |
| `OrderingTests.TC27_ValidateQuota_RejectsInvalidPrescriptionCases(scenario: "outside")` | Passed |
| `OrderingTests.TC27_ValidateQuota_RejectsInvalidPrescriptionCases(scenario: "patient")` | Passed |
| `OrderingTests.TC27_ValidateQuota_RejectsInvalidPrescriptionCases(scenario: "quota")` | Passed |
| `OrderingTests.TC28_UserCannotCallStaffMutations_CompletedQuotaCannotBeCancelled` | Passed |
| `OrderingTests.TC28_UserCannotReview_ConcurrentReservationsRespectLastQuota` | Passed |
| `OrderingTests.TC29_CartAccumulatesUpdatesDeletes_WithoutReservationOrDeduction` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_RejectsWithoutWriting(drugId: "PARA500", existingQuantity: 0, requestedQuantity: 81, update: False, title: "Không đủ hàng, chỉ còn 80 Viên.")` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_RejectsWithoutWriting(drugId: "PARA500", existingQuantity: 2, requestedQuantity: 79, update: False, title: "Không đủ hàng, chỉ còn 80 Viên.")` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_RejectsWithoutWriting(drugId: "PARA500", existingQuantity: 2, requestedQuantity: 81, update: True, title: "Không đủ hàng, chỉ còn 80 Viên.")` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_RejectsWithoutWriting(drugId: "VITC500", existingQuantity: 0, requestedQuantity: 1, update: False, title: "Thuốc tạm hết hàng.")` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_RejectsWithoutWriting(drugId: "VITC500", existingQuantity: 2, requestedQuantity: 1, update: False, title: "Thuốc tạm hết hàng.")` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_RejectsWithoutWriting(drugId: "VITC500", existingQuantity: 2, requestedQuantity: 3, update: True, title: "Thuốc tạm hết hàng.")` | Passed |
| `OrderingTests.TC29_D9_CartStockGuard_UsesAvailableAfterReservations_AllowsExactBoundary` | Passed |
| `OrderingTests.TC29_D9_OutOfStockOldLine_CanDecreaseKeepOrDelete_StillShowsIssue` | Passed |
| `OrderingTests.TC30_CartIsUserOnly_AllRoutesBlocked(role: "admin", status: 403, code: "FORBIDDEN")` | Passed |
| `OrderingTests.TC30_CartIsUserOnly_AllRoutesBlocked(role: "guest", status: 401, code: "UNAUTHENTICATED")` | Passed |
| `OrderingTests.TC30_CartIsUserOnly_AllRoutesBlocked(role: "staff", status: 403, code: "FORBIDDEN")` | Passed |
| `OrderingTests.TC31_CartIssues_BlockInvalidOrder_KeepCartUnchanged(drugId: "HYDRO1", code: "NOT_FOR_SALE")` | Passed |
| `OrderingTests.TC31_CartIssues_BlockInvalidOrder_KeepCartUnchanged(drugId: "VITC500", code: "INSUFFICIENT_STOCK")` | Passed |
| `OrderingTests.TC32_ConcurrentPlacement_OnlyOneOrderConsumesSameCart` | Passed |
| `OrderingTests.TC32_OrderValidation_BlocksMissingAddressAndPrescriptionRequired` | Passed |
| `OrderingTests.TC32_PlaceOtc_SetsOwnerUniqueCodeAndTotal_ClearsCartWithoutReserving(receive: "Delivery")` | Passed |
| `OrderingTests.TC32_PlaceOtc_SetsOwnerUniqueCodeAndTotal_ClearsCartWithoutReserving(receive: "Pickup")` | Passed |
| `OrderingTests.TC33_PendingPrescriptionOrder_WaitsWithoutReservation_ApprovedOrderChecksQuota` | Passed |
| `OrderingTests.TC34_GuestOrOtherOwner_CannotPlaceReadCancelOrUsePrescription` | Passed |
| `OrderingTests.TC36_StaffCannotShipCompleteOrFulfillBeforePaymentAndInvoice` | Passed |
| `OrderingTests.TC36_UserCannotManageStaffOrdersOrDashboard` | Passed |
| `OrderingTests.TC37_D15_DomainReady_PreservesFirstTime_RequiresPickupPreparingAndInvoice` | Passed |
| `OrderingTests.TC37_D15_ReadyPickup_IsIdempotent_SetsHandler_VisibleInCustomerDetailAndLists(role: "admin")` | Passed |
| `OrderingTests.TC37_D15_ReadyPickup_IsIdempotent_SetsHandler_VisibleInCustomerDetailAndLists(role: "staff")` | Passed |
| `OrderingTests.TC37_D15_ReadyRejectsDeliveryOrMissingInvoice_WithoutWriting(receive: "Delivery", invoice: True)` | Passed |
| `OrderingTests.TC37_D15_ReadyRejectsDeliveryOrMissingInvoice_WithoutWriting(receive: "Pickup", invoice: False)` | Passed |
| `OrderingTests.TC37_D8_ReviewFulfillAndComplete_WithoutClaim_PreservesFirstHandler(receive: "Delivery")` | Passed |
| `OrderingTests.TC37_D8_ReviewFulfillAndComplete_WithoutClaim_PreservesFirstHandler(receive: "Pickup")` | Passed |
| `OrderingTests.TC37_StaffDeliveryLifecycle_RequiresInvoice_NeverDeductsAgain(receive: "Delivery")` | Passed |
| `OrderingTests.TC37_StaffDeliveryLifecycle_RequiresInvoice_NeverDeductsAgain(receive: "Pickup")` | Passed |
| `OrderingTests.TC37_StaffRejectCancel_RequiresReason_ReleasesPendingPayment(action: "cancel", status: "Cancelled")` | Passed |
| `OrderingTests.TC37_StaffRejectCancel_RequiresReason_ReleasesPendingPayment(action: "reject", status: "Rejected")` | Passed |

Lượt này chỉ chạy bốn nhóm được chọn. Không có kết quả mới cho toàn suite backend, Playwright, PostgreSQL hoặc kiểm thử hiệu năng.
