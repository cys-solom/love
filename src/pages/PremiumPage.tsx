import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function PremiumPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Premium Content</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Premium Package</CardTitle>
            <CardDescription>Access exclusive content and features</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Enjoy unlimited access to all premium features and content.</p>
            <p className="text-2xl font-bold">$9.99/month</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Subscribe Now</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}