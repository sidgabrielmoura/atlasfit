"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, Heart, Sparkles, Inbox, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RoadmapMySuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDetails: (featureId: string) => void;
}

export function RoadmapMySuggestionsModal({
  isOpen,
  onClose,
  onOpenDetails,
}: RoadmapMySuggestionsModalProps) {
  const [data, setData] = useState<{ created: any[]; voted: any[] }>({ created: [], voted: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("created");

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("/api/roadmap/my-suggestions")
      .then((res) => res.json())
      .then((resData) => {
        setData({
          created: resData.created || [],
          voted: resData.voted || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl! p-6 sm:p-8">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            <UserCheck className="size-3.5" />
            <span>Participação na Comunidade</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Minhas Atividades no Roadmap</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
            <TabsList className="w-full grid grid-cols-2 rounded-xl p-1 bg-secondary/50 h-11">
              <TabsTrigger value="created" className="rounded-lg font-bold text-xs gap-2">
                Minhas Sugestões ({data.created.length})
              </TabsTrigger>
              <TabsTrigger value="voted" className="rounded-lg font-bold text-xs gap-2">
                Ideias Apoiadas ({data.voted.length})
              </TabsTrigger>
            </TabsList>

            {/* Created Features Tab */}
            <TabsContent value="created" className="pt-4 space-y-3">
              {data.created.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card/30">
                  <Inbox className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-bold text-muted-foreground">Você ainda não enviou nenhuma sugestão.</p>
                </div>
              ) : (
                data.created.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onOpenDetails(item.id);
                    }}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1 max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase px-2 py-0.5 border-primary/30 text-primary bg-primary/10">
                          {item.status?.name}
                        </Badge>
                        {item.category && (
                          <span className="text-[10px] text-muted-foreground font-medium">• {item.category.name}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Heart className="size-3.5 fill-current" />
                        <span>{item.voteCount}</span>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Voted Features Tab */}
            <TabsContent value="voted" className="pt-4 space-y-3">
              {data.voted.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card/30">
                  <Inbox className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-bold text-muted-foreground">Você ainda não votou em nenhuma ideia.</p>
                </div>
              ) : (
                data.voted.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onOpenDetails(item.id);
                    }}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1 max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase px-2 py-0.5 border-primary/30 text-primary bg-primary/10">
                          {item.status?.name}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Heart className="size-3.5 fill-current" />
                        <span>{item.voteCount}</span>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
