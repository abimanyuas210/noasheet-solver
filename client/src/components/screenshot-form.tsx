import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL").min(1, "URL is required"),
});

type FormData = z.infer<typeof formSchema>;

interface ScreenshotFormProps {
  userId: string;
  onScreenshotStart: (screenshotId: string) => void;
  disabled?: boolean;
}

export default function ScreenshotForm({ userId, onScreenshotStart, disabled }: ScreenshotFormProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  const createScreenshotMutation = useMutation({
    mutationFn: (data: { url: string; userId: string }) => api.createScreenshot(data),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Screenshot request submitted",
        description: "Your screenshot is being processed...",
      });
      onScreenshotStart(data.id);
      
      // Trigger processing for Vercel deployment
      if (process.env.NODE_ENV === 'production') {
        try {
          await fetch('/api/process-screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ screenshotId: data.id })
          });
        } catch (error) {
          console.error('Failed to trigger screenshot processing:', error);
        }
      }
      
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit screenshot request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createScreenshotMutation.mutate({
      url: data.url,
      userId,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-50 rounded-lg p-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">New Screenshot</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
            LiveWorksheet URL
          </Label>
          <Input
            id="url"
            type="url"
            placeholder="https://www.liveworksheets.com/..."
            {...form.register("url")}
            className="w-full"
            disabled={disabled}
            data-testid="input-url"
          />
          {form.formState.errors.url && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
          )}
        </div>


        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Screenshots are stored for 4 hours</span>
          </div>
          <Button 
            type="submit"
            disabled={disabled || createScreenshotMutation.isPending}
            data-testid="button-submit"
          >
            {createScreenshotMutation.isPending ? "Submitting..." : "Take Screenshot"}
          </Button>
        </div>
      </form>
    </div>
  );
}
