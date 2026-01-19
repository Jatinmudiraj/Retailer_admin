import React, { createContext, useContext, useEffect, useState } from "react";
import { PublicProduct } from "../api";

export type CartItem = {
    product: PublicProduct;
    qty: number;
};

type CartContextType = {
    items: CartItem[];
    addToCart: (product: PublicProduct, qty?: number) => void;
    removeFromCart: (sku: string) => void;
    clearCart: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    cartTotal: number;
};

const CartContext = createContext<CartContextType>({} as CartContextType);

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem("royaliq_cart");
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem("royaliq_cart", JSON.stringify(items));
    }, [items]);

    function addToCart(product: PublicProduct, qty = 1) {
        setItems(prev => {
            const existing = prev.find(i => i.product.sku === product.sku);
            if (existing) {
                return prev.map(i => i.product.sku === product.sku ? { ...i, qty: i.qty + qty } : i);
            }
            return [...prev, { product, qty }];
        });
        setIsOpen(true);
    }

    function removeFromCart(sku: string) {
        setItems(prev => prev.filter(i => i.product.sku !== sku));
    }

    function clearCart() {
        setItems([]);
    }

    const cartTotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.qty, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, isOpen, setIsOpen, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
}
