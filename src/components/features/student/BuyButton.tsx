"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

export function BuyButton({ courseId, price, currency }: { courseId: string, price: number, currency: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleBuy = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId })
            });
            const data = await res.json();
            if (data.url) {
                router.push(data.url);
            } else {
                alert("Error: " + data.error);
                setLoading(false);
            }
        } catch (e) {
            alert("Checkout failed");
            setLoading(false);
        }
    };

    if (price === 0) {
        return (
            <Button onClick={handleBuy} disabled={loading} size="lg" className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enroll for Free
            </Button>
        );
    }

    return (
        <Button onClick={handleBuy} disabled={loading} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CreditCard className="mr-2 h-4 w-4" />
            Buy for {currency} {price / 100}
        </Button>
    );
}
