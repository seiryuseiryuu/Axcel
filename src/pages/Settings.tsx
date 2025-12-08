import { useState, useEffect } from 'react';
import { useTheme, themeColorOptions, ThemeColor } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Palette, Moon, Sun, Upload, Trash2, User, Users, Sparkles, Image, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AssetType = 'self' | 'member' | 'character' | 'channel_icon' | 'other';

interface ChannelAsset {
  id: string;
  name: string;
  asset_type: AssetType;
  image_url: string;
  description: string | null;
  created_at: string;
}

const assetTypeLabels: Record<AssetType, { label: string; icon: React.ElementType; description: string }> = {
  self: { label: '自分', icon: User, description: '自分の写真（サムネイルの主人公）' },
  member: { label: 'メンバー', icon: Users, description: '他の出演者やメンバーの写真' },
  character: { label: 'キャラクター', icon: Sparkles, description: 'マスコットやキャラクター' },
  channel_icon: { label: 'チャンネルアイコン', icon: Image, description: 'チャンネルのロゴやアイコン' },
  other: { label: 'その他', icon: Image, description: 'その他の素材' },
};

export default function Settings() {
  const { themeColor, setThemeColor } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const [assets, setAssets] = useState<ChannelAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'self' as AssetType,
    description: '',
    file: null as File | null,
    preview: '',
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user]);

  const fetchAssets = async () => {
    if (!user) return;
    setIsLoadingAssets(true);
    try {
      const { data, error } = await supabase
        .from('channel_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAsset(prev => ({
        ...prev,
        file,
        preview: URL.createObjectURL(file),
      }));
    }
  };

  const uploadAsset = async () => {
    if (!user || !newAsset.file || !newAsset.name.trim()) {
      toast({ title: 'エラー', description: '名前と画像を入力してください', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = newAsset.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('channel-assets')
        .upload(fileName, newAsset.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('channel-assets')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('channel_assets')
        .insert({
          user_id: user.id,
          name: newAsset.name,
          asset_type: newAsset.type,
          image_url: publicUrl,
          description: newAsset.description || null,
        });

      if (dbError) throw dbError;

      toast({ title: '保存しました', description: `${assetTypeLabels[newAsset.type].label}として保存しました` });
      
      // Reset form
      setNewAsset({
        name: '',
        type: 'self',
        description: '',
        file: null,
        preview: '',
      });
      
      fetchAssets();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'エラー', description: 'アップロードに失敗しました', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAsset = async (asset: ChannelAsset) => {
    if (!user) return;
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('channel_assets')
        .delete()
        .eq('id', asset.id);

      if (error) throw error;

      toast({ title: '削除しました' });
      fetchAssets();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'エラー', description: '削除に失敗しました', variant: 'destructive' });
    }
  };

  const getAssetsByType = (type: AssetType) => assets.filter(a => a.asset_type === type);

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground mt-1">アプリの外観と素材を管理</p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dark Mode Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                テーマモード
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">ライト</span>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={setIsDarkMode}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">ダーク</span>
                  <Moon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="w-5 h-5" />
                カラーテーマ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {themeColorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setThemeColor(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      themeColor === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        option.colorClass
                      )}
                    >
                      {themeColor === option.value && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <Label className="text-[10px] cursor-pointer">{option.label}</Label>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              チャンネル素材
            </CardTitle>
            <CardDescription>
              サムネイル生成時に常に参照される画像を登録できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload New Asset */}
            <div className="p-4 border border-dashed border-border rounded-lg space-y-4">
              <h4 className="font-medium text-sm">新しい素材を追加</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label>素材の種類</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(Object.entries(assetTypeLabels) as [AssetType, typeof assetTypeLabels[AssetType]][]).map(([type, info]) => (
                        <button
                          key={type}
                          onClick={() => setNewAsset(prev => ({ ...prev, type }))}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all',
                            newAsset.type === type
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <info.icon className="w-4 h-4" />
                          <span>{info.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>名前</Label>
                    <Input
                      value={newAsset.name}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="例: 田中さん"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>説明（任意）</Label>
                    <Textarea
                      value={newAsset.description}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="例: メインの出演者、笑顔が特徴"
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>画像</Label>
                  <label className="block cursor-pointer">
                    <div className={cn(
                      "aspect-video rounded-lg border-2 border-dashed flex items-center justify-center transition-colors",
                      newAsset.preview ? "border-primary" : "border-border hover:border-primary/50"
                    )}>
                      {newAsset.preview ? (
                        <img
                          src={newAsset.preview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">クリックして選択</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  
                  <Button
                    onClick={uploadAsset}
                    disabled={!newAsset.file || !newAsset.name.trim() || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    登録する
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Assets */}
            {isLoadingAssets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                登録された素材はありません
              </p>
            ) : (
              <Tabs defaultValue="self" className="w-full">
                <TabsList className="w-full grid grid-cols-5">
                  {(Object.entries(assetTypeLabels) as [AssetType, typeof assetTypeLabels[AssetType]][]).map(([type, info]) => (
                    <TabsTrigger key={type} value={type} className="text-xs">
                      {info.label} ({getAssetsByType(type).length})
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {(Object.keys(assetTypeLabels) as AssetType[]).map(type => (
                  <TabsContent key={type} value={type} className="mt-4">
                    {getAssetsByType(type).length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        {assetTypeLabels[type].description}の登録はありません
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {getAssetsByType(type).map(asset => (
                          <div key={asset.id} className="relative group">
                            <img
                              src={asset.image_url}
                              alt={asset.name}
                              className="aspect-square object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-2">
                              <p className="text-white text-sm font-medium text-center">{asset.name}</p>
                              {asset.description && (
                                <p className="text-white/70 text-xs text-center mt-1 line-clamp-2">{asset.description}</p>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                className="mt-2"
                                onClick={() => deleteAsset(asset)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                削除
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}