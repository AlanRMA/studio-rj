'use client';

import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogoUploaderProps {
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
  className?: string;
}

export function LogoUploader({ logo, onLogoChange, className }: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onLogoChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLogoChange(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={handleUploadClick}
      className={cn("relative flex items-center justify-center w-36 h-36 border-2 border-dashed rounded-lg group cursor-pointer hover:border-primary transition-colors", className)}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/svg+xml"
      />
      {logo ? (
        <>
          <Image src={logo} alt="Logo da Empresa" layout="fill" objectFit="contain" className="p-2 rounded-lg" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 z-10 hidden w-6 h-6 rounded-full group-hover:flex"
            onClick={handleRemoveLogo}
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="mt-2 text-xs text-muted-foreground">Carregar Logo</span>
        </div>
      )}
    </div>
  );
}
