import React from 'react';
import { Pill, ShieldCheck, Clock, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Cột 1: Thông tin hệ thống */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-bold text-lg">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Pill className="w-5 h-5" />
              </span>
              <span>Pharmacy System</span>
            </div>
            <p className="text-sm text-slate-400">
              Hệ thống quản lý nhà thuốc và đặt thuốc trực tuyến. Đồ án môn Lập trình hướng đối tượng (OOP).
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Chuẩn chất lượng thực hành thuốc tốt GPP</span>
            </div>
          </div>

          {/* Cột 2: Liên hệ & Giờ làm việc */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              Liên hệ & Mở cửa
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <span>1 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Hotline: 1900 8888 (7:00 - 22:00)</span>
              </li>
              <li className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Giờ làm việc: 7:00 - 22:00 hàng ngày</span>
              </li>
            </ul>
          </div>

          {/* Cột 3: Hướng dẫn & Quy định */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              Quy định dược phẩm
            </h4>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>• Thuốc kê đơn yêu cầu đơn thuốc hợp lệ từ bác sĩ</li>
              <li>• Thuốc kiểm soát đặc biệt tuân thủ quy chế BYT</li>
              <li>• Thanh toán chuyển khoản QR đối chiếu thủ công</li>
              <li>• Kiểm tra kỹ số tiền & nội dung trước khi chuyển</li>
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            © 2026 Pharmacy Management System. Đồ án OOP - Nhóm thực hiện: Lê Anh Đức, Chu Ngọc Việt Đức.
          </div>
          <div>
            Giao diện đáp ứng chuẩn màn hình 1366px &amp; 390px
          </div>
        </div>
      </div>
    </footer>
  );
}
