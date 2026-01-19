import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import { AdminUser, authMe } from "./auth";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/Vault";
import BatchSourcing from "./pages/BatchSourcing";
import Intelligence from "./pages/Intelligence";

import SalesArchive from "./pages/SalesArchive";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import Settings from "./pages/Settings";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";

import ShopHome from "./pages/ShopHome";
import ShopProduct from "./pages/ShopProduct";
import CustomerAuth from "./pages/CustomerAuth";
import Checkout from "./pages/Checkout";
import { CustomerProvider } from "./context/CustomerContext";
import { CartProvider } from "./context/CartContext";

function Protected(props: { user: AdminUser | null; children: React.ReactNode }) {
    if (!props.user) return <Navigate to="/login" replace />;
    return <>{props.children}</>;
}

export default function App() {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        authMe()
            .then((x) => {
                setUser(x.user);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    if (!loaded) return <div className="container" style={{ paddingTop: 40 }}>Loading...</div>;

    return (
        <BrowserRouter>
            <CustomerProvider>
                <CartProvider>
                    <Routes>
                        {/* Public Shop Routes */}
                        <Route path="/" element={<ShopHome />} />
                        <Route path="/product/:sku" element={<ShopProduct />} />
                        <Route path="/customer/login" element={<CustomerAuth />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/login" element={<Login />} />

                        {/* Admin Routes */}
                        <Route
                            path="/admin"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <Dashboard />
                                    </Layout>
                                </Protected>
                            }
                        />
                        {/* ... other admin routes ... */}
                        <Route
                            path="/vault"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <Vault />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/batch"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <BatchSourcing />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/products/add"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <AddProduct />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/products/:sku/edit"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <EditProduct />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/intelligence"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <Intelligence />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/sales"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <SalesArchive />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/settings"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <Settings />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/customers"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <Customers />
                                    </Layout>
                                </Protected>
                            }
                        />
                        <Route
                            path="/orders"
                            element={
                                <Protected user={user}>
                                    <Layout user={user!}>
                                        <Orders />
                                    </Layout>
                                </Protected>
                            }
                        />
                        {/* Fallback - Redirect to Shop */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </CartProvider>
            </CustomerProvider>
        </BrowserRouter>
    );
}
