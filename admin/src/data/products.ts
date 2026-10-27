// Datos de placeholder para el dashboard POS.

export interface Category {
  id: string
  label: string
  count: number
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
}

export interface CartItem {
  id: number
  name: string
  size: string
  color: string
  qty: number
  total: number
}

export interface OrderSummary {
  promoLabel: string
  subtotal: number
  tax: number
  taxRate: number
  discount: number
  totalPayment: number
}

export const categories: Category[] = [
  { id: "all", label: "All Product", count: 320 },
  { id: "shoes", label: "Shoes", count: 182 },
  { id: "clothing", label: "Clothing", count: 78 },
  { id: "others", label: "Others Product", count: 60 },
]

export const products: Product[] = [
  {
    id: 1,
    name: "Nike Waffle Debut",
    description:
      "Retro gets modernized in the Nike Waffle Debut. Remember that smooth",
    price: 80.0,
    stock: 218,
  },
  {
    id: 2,
    name: "Nike Tech",
    description:
      "Crafted with stretchy, breathable material, the Nike Tech Woven Jacket",
    price: 130.83,
    stock: 198,
  },
  {
    id: 3,
    name: "Nike V2K Run New",
    description:
      "The Nike Elite Crew Basketball Socks offer a supportive fit and feel",
    price: 16.5,
    stock: 123,
  },
  {
    id: 4,
    name: "Nike P-6000",
    description:
      "The Nike P-6000 draws on the 2006 Nike Air Pegasus, bringing of iconic",
    price: 115.28,
    stock: 121,
  },
  {
    id: 5,
    name: "Nike Zoom Vomero Roam",
    description: "Designed for city conditions, this winterized version",
    price: 187.43,
    stock: 119,
  },
  {
    id: 6,
    name: "Men's Fleece Cargo Pants",
    description: "Clean meets casual with these brushed fleece cargo pants.",
    price: 65.42,
    stock: 192,
  },
  {
    id: 7,
    name: "Nike Air Force 1",
    description:
      "The radiance lives on in the Nike Air Force 1, the basketball icon",
    price: 110.0,
    stock: 218,
  },
  {
    id: 8,
    name: "Nike Sportswear Club",
    description:
      "The soft fabric and classic design make this a go-to everyday fleece",
    price: 55.0,
    stock: 218,
  },
  {
    id: 9,
    name: "Nike Dunk Low Retro",
    description:
      "Created for the hardwood but taken to the streets, a b-ball icon",
    price: 123.0,
    stock: 123,
  },
]

export const cartItems: CartItem[] = [
  {
    id: 3,
    name: "Nike V2K Run New",
    size: "Size 42",
    color: "Green",
    qty: 1,
    total: 182.72,
  },
  {
    id: 10,
    name: "Phantom and Baroque Br...",
    size: "Size 42",
    color: "Brown",
    qty: 1,
    total: 187.92,
  },
]

export const orderSummary: OrderSummary = {
  promoLabel: "Promo New User (10%)",
  subtotal: 370.67,
  tax: 44.48,
  taxRate: 12,
  discount: -41.51,
  totalPayment: 373.64,
}
