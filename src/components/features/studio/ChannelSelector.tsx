"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Trash2, Loader2, Youtube } from "lucide-react";
import { ChannelInput, ChannelThumbnail } from "@/types/thumbnail";
import { fetchChannelInfo, fetchChannelVideos } from "@/app/actions/youtube";
import { useToast } from "@/hooks/use-toast";

// Mock Data for "No API Key" scenario
const MOCK_THUMBNAILS = [
    { title: "月5万稼ぐ副業ロードマップ", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" },
    { title: "ChatGPT完全攻略ガイド", url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80" },
    { title: "初心者向けプログラミング", url: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=80" },
    { title: "Webデザイン上達のコツ", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80" },
    { title: "フリーランスの現実", url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80" },
];

interface ChannelSelectorProps {
    channels: ChannelInput[];
    onAddChannel: () => void;
    onRemoveChannel: (id: string) => void;
    onUpdateChannel: (id: string, data: Partial<ChannelInput>) => void;
    onSelectThumbnail: (thumb: ChannelThumbnail) => void;
    selectedThumbnails: ChannelThumbnail[];
}

export function ChannelSelector({
    channels,
    onAddChannel,
    onRemoveChannel,
    onUpdateChannel,
    onSelectThumbnail,
    selectedThumbnails
}: ChannelSelectorProps) {
    const { toast } = useToast();

    const handleFetch = async (channel: ChannelInput) => {
        if (!channel.url) {
            toast({ title: "エラー", description: "チャンネルURLを入力してください", variant: "destructive" });
            return;
        }

        onUpdateChannel(channel.id, { isLoading: true });

        try {
            const infoRes = await fetchChannelInfo(channel.url);

            if (!infoRes.success) {
                onUpdateChannel(channel.id, { isLoading: false });
                toast({
                    title: "取得エラー",
                    description: infoRes.error,
                    variant: "destructive"
                });
                return;
            }

            const info = infoRes.data;
            const videosRes = await fetchChannelVideos(info.id, info.uploadsPlaylistId);

            if (!videosRes.success) {
                onUpdateChannel(channel.id, { isLoading: false });
                toast({
                    title: "動画取得エラー",
                    description: videosRes.error,
                    variant: "destructive"
                });
                return;
            }

            const videos = videosRes.data;

            if (videos.length === 0) {
                toast({
                    title: "動画が見つかりませんでした",
                    description: "ショート動画を除外した結果、表示できる動画がありませんでした。",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "取得成功",
                    description: `${info.name} から ${videos.length}本の動画を取得しました`,
                });
            }

            const newThumbnails = videos.map(v => ({
                ...v,
                id: `${channel.id}-${v.video_id}`,
                channel_type: channel.type,
                channel_name: info.name
            }));

            onUpdateChannel(channel.id, {
                isLoading: false,
                name: info.name,
                thumbnails: newThumbnails
            });

            // Auto-select first 5 videos for own channel
            if (channel.type === 'own' && newThumbnails.length > 0) {
                const autoSelectCount = Math.min(5, newThumbnails.length);
                for (let i = 0; i < autoSelectCount; i++) {
                    onSelectThumbnail(newThumbnails[i]);
                }
            }
        } catch (error: any) {
            console.error(error);
            onUpdateChannel(channel.id, { isLoading: false });
            toast({
                title: "取得エラー",
                description: error.message || "チャンネル情報の取得に失敗しました。URLを確認してください。",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            {channels.map((channel, index) => (
                <Card key={channel.id} className="border-border/30 bg-muted/30 backdrop-blur-sm">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Youtube className={channel.type === 'own' ? "text-primary" : "text-destructive"} />
                                {channel.type === 'own' ? '自分のチャンネル' : `競合チャンネル ${index}`}
                            </h3>
                            {channel.type === 'competitor' && (
                                <Button variant="ghost" size="sm" onClick={() => onRemoveChannel(channel.id)}>
                                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="チャンネルURL (@handle)"
                                value={channel.url}
                                onChange={(e) => onUpdateChannel(channel.id, { url: e.target.value })}
                                className="bg-background"
                            />
                            <Button
                                onClick={() => handleFetch(channel)}
                                disabled={channel.isLoading}
                                className="min-w-[100px]"
                            >
                                {channel.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                <span className="ml-2">取得</span>
                            </Button>
                        </div>

                        {channel.thumbnails.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                                {channel.thumbnails.map((thumb) => {
                                    const isSelected = selectedThumbnails.some(t => t.id === thumb.id);
                                    return (
                                        <div
                                            key={thumb.id}
                                            onClick={() => onSelectThumbnail(thumb)}
                                            className={`
                                                relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all
                                                ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}
                                            `}
                                        >
                                            <img src={thumb.thumbnail_url} alt={thumb.video_title} className="aspect-video object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                                <p className="text-white text-xs line-clamp-2">{thumb.video_title}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                                                    <Youtube className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            <Button variant="outline" onClick={onAddChannel} className="w-full border-dashed py-6">
                <Plus className="w-4 h-4 mr-2" /> 競合チャンネルを追加
            </Button>
        </div>
    );
}
