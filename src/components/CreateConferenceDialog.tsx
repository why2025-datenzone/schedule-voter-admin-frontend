import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createEvent } from "@/api/apiService";
import type { CreateEventPayload } from "@/api/types";

interface CreateConferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newEvent: CreateEventPayload) => void;
}

export function CreateConferenceDialog({ open, onOpenChange, onSuccess }: CreateConferenceDialogProps) {
  const [newConferenceName, setNewConferenceName] = React.useState('');
  const [newConferenceSlug, setNewConferenceSlug] = React.useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createEventMutation = useMutation<void, Error, CreateEventPayload>({
    mutationFn: createEvent,
    onSuccess: (_, reqVariables) => {
      toast.success(`Conference "${reqVariables.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setNewConferenceName('');
      setNewConferenceSlug('');
      onOpenChange(false); 
      if (onSuccess) {
        onSuccess(reqVariables);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create conference: ${error.message}`);
    },
  });

  React.useEffect(() => {
    if (open && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleCreateConferenceSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newConferenceName.trim() || !newConferenceSlug.trim()) {
      toast.error("Name and slug cannot be empty.");
      return;
    }
    createEventMutation.mutate({ name: newConferenceName, slug: newConferenceSlug });
  };
  
  const handleDialogStateChange = (isOpen: boolean) => {
    if (!isOpen) {
        if (!createEventMutation.isPending) {
            setNewConferenceName('');
            setNewConferenceSlug('');
        }
    }
    onOpenChange(isOpen);
  };


  return (
    <Dialog open={open} onOpenChange={handleDialogStateChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Conference</DialogTitle>
          <DialogDescription>
            Enter the details for your new conference. The slug will be used in the URL.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateConferenceSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                ref={nameInputRef}
                value={newConferenceName}
                onChange={(e) => setNewConferenceName(e.target.value)}
                className="col-span-3"
                disabled={createEventMutation.isPending}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="text-right">
                Slug
              </Label>
              <Input
                id="slug"
                value={newConferenceSlug}
                onChange={(e) => setNewConferenceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                className="col-span-3"
                placeholder="e.g. my-cool-event-2025"
                disabled={createEventMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogStateChange(false)} disabled={createEventMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEventMutation.isPending || !newConferenceName.trim() || !newConferenceSlug.trim()}>
              {createEventMutation.isPending ? "Creating..." : "Create Conference"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}