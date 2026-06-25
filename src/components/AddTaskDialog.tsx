import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, type Category, type Priority } from "@/lib/store";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddTaskDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { addTask } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("study");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedMinutes, setPlannedMinutes] = useState(60);

  const reset = () => {
    setTitle(""); setDescription(""); setCategory("study"); setPriority("medium");
    setDueDate(new Date().toISOString().slice(0, 10)); setPlannedMinutes(60);
  };

  const submit = () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    addTask({ title: title.trim(), description: description.trim() || undefined, category, priority, dueDate, plannedMinutes });
    toast.success("Task added");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="fixed bottom-24 right-[calc(50%-11rem)] z-30 h-14 w-14 rounded-full bg-gradient-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:scale-105 transition-transform">
            <Plus className="h-6 w-6" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>New activity</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read chapter 3" />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="study">Study</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="exercise">Exercise</SelectItem>
                  <SelectItem value="chores">Chores</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="rest">Rest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="plan">Planned (min)</Label>
              <Input id="plan" type="number" min={5} step={5} value={plannedMinutes} onChange={(e) => setPlannedMinutes(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={submit} className="w-full bg-gradient-primary text-primary-foreground border-0">Add task</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
