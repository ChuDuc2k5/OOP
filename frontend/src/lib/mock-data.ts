import {
  DashboardSummary,
  DrugAdmin,
  Me,
  Paged,
  Product,
} from './types';

// Danh sách tài khoản demo theo SRS §8
export const MOCK_ACCOUNTS: Record<string, { user: Me; password: string }> = {
  admin: {
    user: {
      userId: 'U00000001',
      username: 'admin',
      role: 'Admin',
      homePath: '/admin',
    },
    password: 'Admin@12345',
  },
  staff: {
    user: {
      userId: 'U00000002',
      username: 'staff',
      role: 'Staff',
      homePath: '/staff',
    },
    password: 'Staff@12345',
  },
  user: {
    user: {
      userId: 'U00000003',
      username: 'user',
      role: 'User',
      homePath: '/',
    },
    password: 'User@12345',
  },
  user2: {
    user: {
      userId: 'U00000004',
      username: 'user2',
      role: 'User',
      homePath: '/',
    },
    password: 'User@12345',
  },
};

// ≥ 12 thuốc mẫu theo SRS §8
export const MOCK_DRUGS: DrugAdmin[] = [
  {
    drugId: 'PARA500',
    name: 'Paracetamol 500mg',
    description: 'Thuốc giảm đau, hạ sốt thông thường dùng trong các trường hợp cảm cúm, nhức đầu.',
    saleUnit: 'Hộp',
    unitPrice: 35000,
    lowStockThreshold: 20,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'AMOX500',
    name: 'Amoxicillin 500mg',
    description: 'Kháng sinh nhóm penicillin điều trị nhiễm khuẩn hô hấp, tiết niệu, tai mũi họng.',
    saleUnit: 'Vỉ',
    unitPrice: 45000,
    lowStockThreshold: 15,
    requiresPrescription: true,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'IBUP400',
    name: 'Ibuprofen 400mg',
    description: 'Thuốc chống viêm không steroid (NSAID), giảm đau khớp, đau răng, đau bụng kinh.',
    saleUnit: 'Hộp',
    unitPrice: 55000,
    lowStockThreshold: 25,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'BERB100',
    name: 'Berberin 100mg',
    description: 'Thuốc điều trị tiêu chảy, kiết lỵ, viêm ruột từ thảo mộc.',
    saleUnit: 'Lọ',
    unitPrice: 28000,
    lowStockThreshold: 30,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'MORPH10',
    name: 'Morphin Sulfat 10mg',
    description: 'Thuốc giảm đau mạnh thuộc nhóm opioid gây nghiện, kiểm soát đặc biệt.',
    saleUnit: 'Ống',
    unitPrice: 120000,
    lowStockThreshold: 10,
    requiresPrescription: true,
    isControlled: true,
    isForSale: true,
  },
  {
    drugId: 'DIAZ005',
    name: 'Diazepam 5mg',
    description: 'Thuốc hướng thần an thần, giải lo âu, kiểm soát co giật.',
    saleUnit: 'Hộp',
    unitPrice: 90000,
    lowStockThreshold: 10,
    requiresPrescription: true,
    isControlled: true,
    isForSale: true,
  },
  {
    drugId: 'PANADOL',
    name: 'Panadol Extra Đỏ',
    description: 'Giảm đau hạ sốt có chứa paracetamol và caffeine.',
    saleUnit: 'Hộp',
    unitPrice: 42000,
    lowStockThreshold: 50,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'OMEP20',
    name: 'Omeprazole 20mg',
    description: 'Thuốc ức chế bơm proton điều trị trào ngược dạ dày, viêm loét dạ dày tá tràng.',
    saleUnit: 'Hộp',
    unitPrice: 65000,
    lowStockThreshold: 20,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'CETI10',
    name: 'Cetirizine 10mg',
    description: 'Thuốc kháng histamin chống dị ứng, viêm mũi dị ứng, mề đay.',
    saleUnit: 'Hộp',
    unitPrice: 32000,
    lowStockThreshold: 20,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'CEFA500',
    name: 'Cefalexin 500mg',
    description: 'Kháng sinh cephalosporin thế hệ 1 dùng cho nhiễm khuẩn da và đường hô hấp.',
    saleUnit: 'Hộp',
    unitPrice: 48000,
    lowStockThreshold: 15,
    requiresPrescription: true,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'VITC500',
    name: 'Vitamin C 500mg C sủi',
    description: 'Viên sủi bổ sung vitamin C, tăng cường sức đề kháng và giảm mệt mỏi.',
    saleUnit: 'Tuýp',
    unitPrice: 38000,
    lowStockThreshold: 40,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'AZITH500',
    name: 'Azithromycin 500mg',
    description: 'Kháng sinh nhóm macrolide điều trị viêm phổi, viêm họng, nhiễm khuẩn sinh dục.',
    saleUnit: 'Hộp',
    unitPrice: 110000,
    lowStockThreshold: 10,
    requiresPrescription: true,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'DISC001',
    name: 'Thuốc Mẫu Tắt Bán',
    description: 'Sản phẩm đã ngừng kinh doanh để kiểm thử điều kiện isForSale=false.',
    saleUnit: 'Hộp',
    unitPrice: 50000,
    lowStockThreshold: 5,
    requiresPrescription: false,
    isControlled: false,
    isForSale: false, // Tắt bán
  },
  {
    drugId: 'OUT001',
    name: 'Siro Ho Trẻ Em (Tạm hết hàng)',
    description: 'Siro trị ho long đờm cho trẻ nhỏ - minh họa sản phẩm hết hàng tồn kho.',
    saleUnit: 'Chai',
    unitPrice: 40000,
    lowStockThreshold: 10,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
];

// Bản đồ số lượng tồn kho mẫu cho mỗi thuốc
export const MOCK_STOCK: Record<string, number> = {
  PARA500: 150,
  AMOX500: 45,
  IBUP400: 80,
  BERB100: 200,
  MORPH10: 12,
  DIAZ005: 18,
  PANADOL: 300,
  OMEP20: 60,
  CETI10: 95,
  CEFA500: 30,
  VITC500: 180,
  AZITH500: 25,
  DISC001: 50,
  OUT001: 0, // Hết hàng
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  pendingPrescriptions: 3,
  awaitingPaymentOrders: 4,
  pendingPayments: 2,
  preparingOrders: 5,
  lowStockCount: 2,
  expiringCount: 1,
};

/**
 * Chuyển đổi DrugAdmin sang Product cho Guest / User
 * Với Guest (currentUser === null): KHÔNG CÓ THUỘC TÍNH unitPrice trong object trả về!
 */
export function mapDrugToProduct(drug: DrugAdmin, isAuthenticated: boolean): Product {
  const stock = MOCK_STOCK[drug.drugId] ?? 0;
  const inStock = stock > 0;

  const base: Product = {
    drugId: drug.drugId,
    name: drug.name,
    description: drug.description,
    imageUrl: drug.imageUrl,
    saleUnit: drug.saleUnit,
    requiresPrescription: drug.requiresPrescription,
    isControlled: drug.isControlled,
    inStock,
  };

  if (isAuthenticated) {
    base.unitPrice = drug.unitPrice;
  }

  return base;
}

/**
 * Mock query danh sách sản phẩm theo API Contract
 */
export function getMockProducts(
  search: string = '',
  page: number = 1,
  pageSize: number = 20,
  isAuthenticated: boolean = false
): Paged<Product> {
  const normalizedSearch = search.trim().toLowerCase();
  
  // Chỉ lấy thuốc đang bán isForSale === true
  let filtered = MOCK_DRUGS.filter((d) => d.isForSale);

  if (normalizedSearch) {
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(normalizedSearch) ||
        d.drugId.toLowerCase().includes(normalizedSearch)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return {
    items: pageItems.map((d) => mapDrugToProduct(d, isAuthenticated)),
    page,
    pageSize,
    total,
  };
}

/**
 * Mock chi tiết 1 sản phẩm
 */
export function getMockProductById(
  drugId: string,
  isAuthenticated: boolean = false
): Product | null {
  const drug = MOCK_DRUGS.find((d) => d.drugId.toLowerCase() === drugId.toLowerCase());
  if (!drug || !drug.isForSale) {
    return null;
  }
  return mapDrugToProduct(drug, isAuthenticated);
}
