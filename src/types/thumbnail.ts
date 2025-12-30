export type ChannelThumbnail = {
    id: string;
    video_id: string;
    video_title: string;
    thumbnail_url: string;
    channel_name?: string;
    channel_type?: string;
};

export type ChannelInput = {
    id: string;
    url: string;
    name: string;
    type: 'own' | 'competitor';
    icon?: string;
    thumbnails: ChannelThumbnail[];
    isLoading: boolean;
};
