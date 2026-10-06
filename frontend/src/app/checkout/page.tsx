'use client';
import { ActionButton } from '@/components/ActionButton';

import React, { useEffect, useState, useCallback } from 'react';
import { LoadingState } from '@/components/Status';
import { ErrorState } from '@/components/Status';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { cartApi, ordersApi, paymentApi, prescriptionsApi, ApiException } from '@/lib/api';
import { notify } from '@/lib/feedback';
import { CartView, PlaceOrderInput, PrescriptionView, ReceiveMethod, SaleKind } from '@/lib/types';
import { formatVND } from '@/lib/format';
import {
  CreditCard,
  MapPin,
  Phone,
  User as UserIcon,
  Store,
  Truck,
  FileText,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default function CheckoutPage() {
  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const router = useRouter();

  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Usable prescriptions for Rx orders
  const [usablePrescriptions, setUsablePrescriptions] = useState<PrescriptionView[]>([]);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  // Form State
  const [receiverName, setReceiverName] = useState('');
  const [phone, setPhone] = useState('');
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('Delivery');
  const [address, setAddress] = useState('');
  const [saleKind, setSaleKind] = useState<SaleKind>('OTC');
  const [prescriptionId, setPrescriptionId] = useState<string>('');

  // 409 PRICE_CHANGED Modal State
  const [priceChangedData, setPriceChangedData] = useState<{
    newCart: CartView;
    oldTotal: number;
    newTotal: number;
  } | null>(null);

  const initData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPrescriptionError(null);
    try {
      const cartData = await cartApi.getCart();
      if (cartData.items.length === 0) {
        router.replace('/cart');
        return;
      }
      setCart(cartData);

      // Nếu giỏ hàng có thuốc kê đơn hoặc kiểm soát -> Bắt buộc chọn Prescription
      const needsPrescription = cartData.items.some(
        (i) => i.requiresPrescription || i.isControlled
      );
      if (needsPrescription) {
        setSaleKind('Prescription');
      }

      // Nạp danh sách đơn thuốc có thể dùng
      try {
        const presList = await prescriptionsApi.getUsablePrescriptions();
        setUsablePrescriptions(presList);
        if (presList.length > 0) {
          setPrescriptionId(presList[0].prescriptionId);
        }
      } catch (presErr) {
        setPrescriptionError(presErr instanceof ApiException ? presErr.title : 'Không thể tải danh sách đơn thuốc. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Lỗi tải thông tin thanh toán';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authorized && user) {
      initData();
      if (user.username) {
        setReceiverName(user.username);
      }
    }
  }, [authorized, user, initData]);

  const handleSubmitOrder = async (expectedTotalOverride?: number) => {
    if (!cart || submitting) return;
    setError(null);
    setFieldErrors({});

    const totalToSubmit = expectedTotalOverride ?? cart.subtotal;

    // Client Validation
    const errors: Record<string, string[]> = {};
    if (!receiverName.trim()) {
      errors.receiverName = ['Vui lòng nhập họ tên người nhận'];
    }
    if (!phone.trim()) {
      errors.phone = ['Vui lòng nhập số điện thoại'];
    } else if (!/^[0-9]{9,11}$/.test(phone.trim())) {
      errors.phone = ['Số điện thoại không hợp lệ (9-11 chữ số)'];
    }

    if (receiveMethod === 'Delivery' && !address.trim()) {
      errors.address = ['Vui lòng nhập địa chỉ giao hàng'];
    }

    const needsPrescription = cart.items.some(
      (i) => i.requiresPrescription || i.isControlled
    );
    if (needsPrescription && saleKind !== 'Prescription') {
      errors.saleKind = [
        'Giỏ hàng chứa thuốc cần kê đơn/kiểm soát. Bắt buộc phải chọn loại đơn Theo đơn thuốc.',
      ];
    }

    if (saleKind === 'Prescription' && !prescriptionId) {
      errors.prescriptionId = ['Vui lòng chọn đơn thuốc đính kèm'];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload: PlaceOrderInput = {
      saleKind,
      receiverName: receiverName.trim(),
      phone: phone.trim(),
      receiveMethod,
      address: receiveMethod === 'Delivery' ? address.trim() : undefined,
      prescriptionId: saleKind === 'Prescription' ? prescriptionId : undefined,
      expectedTotal: totalToSubmit,
    };

    setSubmitting(true);
    try {
      const createdOrder = await ordersApi.placeOrder(payload);

      if (createdOrder.status === 'AwaitingPayment' && createdOrder.canPay) {
        try {
          await paymentApi.openOrGetPayment(createdOrder.orderId);
          router.push(`/orders/${createdOrder.orderId}/payment?created=1`);
        } catch (paymentError) {
          const title = paymentError instanceof ApiException ? paymentError.title : 'Không thể mở thanh toán. Vui lòng thử lại tại đơn hàng.';
          sessionStorage.setItem(`payment-error:${createdOrder.orderId}`, title);
          router.push(`/orders/${createdOrder.orderId}?created=1`);
        }
      } else {
        if (createdOrder.status === 'WaitingReview') notify({ kind: 'info', message: 'Đơn đang chờ dược sĩ kiểm tra đơn thuốc. Bạn sẽ thanh toán sau khi đơn thuốc được duyệt.' });
        router.push(`/orders/${createdOrder.orderId}?created=1`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        // Xử lý mã lỗi 409 PRICE_CHANGED
        if (err.code === 'PRICE_CHANGED' && err.data) {
          const newCart = err.data as CartView;
          setPriceChangedData({
            newCart,
            oldTotal: totalToSubmit,
            newTotal: newCart.subtotal,
          });
          return;
        }

        if (err.errors) {
          setFieldErrors(err.errors);
        }
        setError(err.title || 'Không thể tạo đơn hàng');
      } else {
        setError('Đã xảy ra lỗi hệ thống khi đặt hàng. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPriceChange = async () => {
    if (!priceChangedData) return;
    const newSubtotal = priceChangedData.newTotal;
    setCart(priceChangedData.newCart);
    setPriceChangedData(null);
    // Gửi lại với expectedTotal mới
    await handleSubmitOrder(newSubtotal);
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  const needsPrescription = cart?.items.some(
    (i) => i.requiresPrescription || i.isControlled
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
            <span>/</span>
            <Link href="/cart" className="hover:text-emerald-700">Giỏ hàng</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Xác nhận đặt hàng</span>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại giỏ hàng</span>
          </Link>
        </div>

        {loading ? <LoadingState /> : error && !cart ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold">{error}</p>
            <Link
              href="/cart"
              className="inline-block px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold"
            >
              Về giỏ hàng
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Form checkout */}
            <div className="lg:col-span-2 space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Đặt hàng chưa thành công:</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Box 1: Thông tin người nhận */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
                  <UserIcon className="w-5 h-5 text-emerald-600" />
                  <span>1. Thông tin người nhận thuốc</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="receiverName" className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên người nhận <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="receiverName" value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        fieldErrors.receiverName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      }`}
                    />
                    {fieldErrors.receiverName && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.receiverName.join(', ')}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        id="phone" value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0901234567"
                        className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          fieldErrors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone.join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Hình thức nhận hàng */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <span>2. Hình thức nhận hàng</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      receiveMethod === 'Delivery'
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="receiveMethod"
                      value="Delivery"
                      checked={receiveMethod === 'Delivery'}
                      onChange={() => setReceiveMethod('Delivery')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Giao tận nơi</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Nhà thuốc giao thuốc đến địa chỉ của bạn.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      receiveMethod === 'Pickup'
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="receiveMethod"
                      value="Pickup"
                      checked={receiveMethod === 'Pickup'}
                      onChange={() => setReceiveMethod('Pickup')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Nhận tại quầy nhà thuốc</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Đến nhận thuốc trực tiếp tại quầy sau khi đơn sẵn sàng.
                      </p>
                    </div>
                  </label>
                </div>

                {receiveMethod === 'Delivery' ? (
                  <div className="pt-2">
                    <label htmlFor="address" className="block text-xs font-semibold text-slate-700 mb-1">
                      Địa chỉ nhận thuốc chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        rows={2}
                        id="address" value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                        className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          fieldErrors.address ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    {fieldErrors.address && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.address.join(', ')}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800">Địa chỉ quầy nhà thuốc:</strong> 1 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh.
                      <div className="text-[11px] text-slate-400 mt-0.5">Thời gian mở cửa: 7:00 - 22:00 hàng ngày.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 3: Quy chế kê đơn & Phân loại đơn */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>3. Phân loại đơn &amp; Đơn thuốc đính kèm</span>
                </div>

                {needsPrescription ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Đơn hàng bắt buộc bán theo đơn thuốc (Rx):</strong>
                      Giỏ hàng của bạn chứa sản phẩm thuộc danh mục thuốc kê đơn hoặc kiểm soát đặc biệt. Bạn phải chọn đơn thuốc hợp lệ để gửi kèm.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="saleKind"
                        value="OTC"
                        checked={saleKind === 'OTC'}
                        onChange={() => setSaleKind('OTC')}
                        className="text-emerald-600"
                      />
                      <span className="font-semibold text-slate-800">Không theo đơn (OTC)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="saleKind"
                        value="Prescription"
                        checked={saleKind === 'Prescription'}
                        onChange={() => setSaleKind('Prescription')}
                        className="text-emerald-600"
                      />
                      <span className="font-semibold text-slate-800">Theo đơn thuốc của bác sĩ</span>
                    </label>
                  </div>
                )}

                {fieldErrors.saleKind && <p className="text-xs text-rose-600">{fieldErrors.saleKind.join(' ')}</p>}
                {saleKind === 'Prescription' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Chọn đơn thuốc của bạn <span className="text-rose-500">*</span>
                      </label>
                      <Link
                        href="/prescriptions/new"
                        target="_blank"
                        className="inline-flex items-center space-x-1 text-xs text-emerald-700 font-semibold hover:underline"
                      >
                        <span>+ Tải lên đơn thuốc mới</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {prescriptionError ? <ErrorState message={prescriptionError} retry={initData} /> : usablePrescriptions.length === 0 ? (
                      <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 space-y-3">
                        <p className="font-medium">Bạn chưa có đơn thuốc nào được duyệt hoặc đang chờ kiểm tra.</p>
                        <p className="text-slate-600">
                          Vui lòng bấm vào nút bên dưới để chụp ảnh và gửi đơn thuốc của bạn trước khi hoàn tất đặt hàng.
                        </p>
                        <Link
                          href="/prescriptions/new"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold text-xs shadow-xs"
                        >
                          <span>Tải ảnh đơn thuốc ngay</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <select id="prescriptionId"
                        value={prescriptionId}
                        onChange={(e) => setPrescriptionId(e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                          fieldErrors.prescriptionId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      >
                        {usablePrescriptions.map((pres) => (
                          <option key={pres.prescriptionId} value={pres.prescriptionId}>
                            {pres.prescriptionId} — Bệnh nhân: {pres.patientName} (Trạng thái:{' '}
                            {pres.status === 'Approved' ? 'Đã duyệt' : 'Chờ kiểm tra'})
                          </option>
                        ))}
                      </select>
                    )}
                    {fieldErrors.prescriptionId && (
                      <p className="text-[11px] text-rose-600">{fieldErrors.prescriptionId.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Review Items & Submit Button */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Đơn hàng ({cart?.items.length} món)
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-100 pr-1">
                {cart?.items.map((i) => (
                  <div key={i.drugId} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 block line-clamp-1">{i.name}</span>
                      <span className="text-slate-400">
                        {i.quantity} {i.saleUnit} × {formatVND(i.unitPrice)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      {formatVND(i.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền thuốc:</span>
                  <span className="font-semibold text-slate-800">{formatVND(cart?.subtotal)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    {formatVND(cart?.subtotal)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-emerald-900 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hình thức thanh toán:</span>
                </div>
                <p>Chuyển khoản qua mã QR tĩnh (Admin/Staff duyệt đối chiếu) hoặc nhận tiền mặt tại quầy.</p>
              </div>

              <ActionButton busy={submitting}
                type="button"
                onClick={() => handleSubmitOrder()}
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition shadow-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo đơn hàng...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Đặt hàng &amp; thanh toán</span>
                  </>
                )}
              </ActionButton>
            </div>
          </div>
        )}

        {/* 409 PRICE_CHANGED Modal (BR-18 / FR-013) */}
        {priceChangedData && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-amber-200 space-y-4 animate-fadeIn">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Giá sản phẩm đã được cập nhật
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Trong quá trình kiểm tra, hệ thống nhận thấy đơn giá một số thuốc trong giỏ đã thay đổi từ lúc bạn bắt đầu đặt hàng.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng tiền đã thấy:</span>
                  <span className="line-through text-slate-400 font-semibold">
                    {formatVND(priceChangedData.oldTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="font-bold text-slate-800">Tổng tiền mới tính lại:</span>
                  <span className="font-extrabold text-emerald-700 text-base">
                    {formatVND(priceChangedData.newTotal)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/cart')}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                >
                  Xem lại giỏ hàng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPriceChange}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Đồng ý đặt giá mới
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
