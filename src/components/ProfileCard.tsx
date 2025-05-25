import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ProfileCardProps {
  imageUrl: string;
  tagline: string;
  name: string;
  galleryImages?: string[];
}

const ProfileCard: React.FC<ProfileCardProps> = ({ imageUrl, tagline, name, galleryImages = [] }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <>
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogTrigger asChild>
          <div className="bg-seductive-card-bg border border-seductive-card-border rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer max-w-sm mx-auto">
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-72 object-cover"
            />
            <div className="p-4 text-center">
              <h3 className="text-lg font-bold text-seductive-text mb-1">{name}</h3>
              <p className="text-sm text-seductive-text/80">{tagline}</p>
              {galleryImages.length > 0 && (
                <p className="text-xs text-seductive-accent mt-2">اضغط لرؤية المزيد من الصور ({galleryImages.length})</p>
              )}
            </div>
          </div>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-4 right-4 z-50 text-white hover:text-seductive-accent transition-colors"
            >
              <X size={24} />
            </button>
            
            {galleryImages.length > 0 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-seductive-accent transition-colors z-40"
                >
                  <ChevronLeft size={32} />
                </button>
                
                <img
                  src={galleryImages[currentImageIndex]}
                  alt={`${name} - صورة ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-seductive-accent transition-colors z-40"
                >
                  <ChevronRight size={32} />
                </button>
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
                  {currentImageIndex + 1} / {galleryImages.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileCard;
