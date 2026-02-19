import { create } from "zustand";

export type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  imeiId?: string;
  imei?: string;
};

type PosState = {
  items: CartItem[];
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  discountType: "PERCENTAGE" | "FIXED" | null;
  discountValue: number;
  addItem: (item: Omit<CartItem, "totalPrice"> & { totalPrice?: number }) => void;
  removeItem: (index: number) => void;
  updateItemQty: (index: number, quantity: number) => void;
  updateItemTotal: (index: number, totalPrice: number) => void;
  setCustomer: (id: string | null, name: string, phone: string) => void;
  setDiscount: (type: "PERCENTAGE" | "FIXED" | null, value: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDiscountAmount: (subtotal: number) => number;
  getVatableAmount: (subtotal: number, discountAmount: number) => number;
  getVatAmount: (vatableAmount: number, vatRate: number) => number;
  getGrandTotal: (vatRate: number) => {
    subtotal: number;
    discountAmount: number;
    vatableAmount: number;
    vatAmount: number;
    grandTotal: number;
  };
};

export const usePosStore = create<PosState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: "",
  customerPhone: "",
  discountType: null,
  discountValue: 0,

  addItem: (item) => {
    const totalPrice =
      item.quantity * item.unitPrice - (item.discount ?? 0);
    set((state) => {
      // For non-IMEI products, merge with existing same product line (update count)
      if (!item.imeiId) {
        const existingIndex = state.items.findIndex(
          (i) => i.productId === item.productId && !i.imeiId
        );
        if (existingIndex >= 0) {
          const existing = state.items[existingIndex];
          const newQty = existing.quantity + item.quantity;
          const newTotalPrice = newQty * existing.unitPrice - existing.discount;
          const next = [...state.items];
          next[existingIndex] = {
            ...existing,
            quantity: newQty,
            totalPrice: newTotalPrice,
          };
          return { items: next };
        }
      }
      return {
        items: [...state.items, { ...item, totalPrice: totalPrice as number }],
      };
    });
  },

  removeItem: (index) => {
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    }));
  },

  updateItemQty: (index, quantity) => {
    set((state) => {
      const next = [...state.items];
      if (next[index]) {
        next[index] = {
          ...next[index],
          quantity,
          totalPrice: quantity * next[index].unitPrice - next[index].discount,
        };
      }
      return { items: next };
    });
  },

  updateItemTotal: (index, totalPrice) => {
    set((state) => {
      const next = [...state.items];
      if (next[index] && totalPrice >= 0) {
        const line = next[index];
        const original = line.quantity * line.unitPrice;
        const discount = Math.max(0, original - totalPrice);
        next[index] = {
          ...line,
          totalPrice,
          discount,
        };
      }
      return { items: next };
    });
  },

  setCustomer: (id, name, phone) => {
    set({ customerId: id, customerName: name, customerPhone: phone });
  },

  setDiscount: (type, value) => {
    set({ discountType: type, discountValue: value });
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      customerName: "",
      customerPhone: "",
      discountType: null,
      discountValue: 0,
    });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.totalPrice, 0);
  },

  getDiscountAmount: (subtotal) => {
    const { discountType, discountValue } = get();
    if (!discountType || discountValue <= 0) return 0;
    if (discountType === "PERCENTAGE") return (subtotal * discountValue) / 100;
    return discountValue;
  },

  getVatableAmount: (subtotal, discountAmount) => {
    return subtotal - discountAmount;
  },

  getVatAmount: (vatableAmount, vatRate) => {
    return (vatableAmount * vatRate) / 100;
  },

  getGrandTotal: (vatRate) => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount(subtotal);
    const vatableAmount = get().getVatableAmount(subtotal, discountAmount);
    const vatAmount = get().getVatAmount(vatableAmount, vatRate);
    const grandTotal = vatableAmount + vatAmount;
    return {
      subtotal,
      discountAmount,
      vatableAmount,
      vatAmount,
      grandTotal,
    };
  },
}));
