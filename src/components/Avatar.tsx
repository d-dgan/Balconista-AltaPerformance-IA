import { useState, useEffect, useRef } from 'react';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    name?: string;
    size?: string;
    className?: string;
}

/**
 * Reusable Avatar component with automatic error handling and lazy loading.
 * Falls back to UI Avatars if the image fails to load or is missing.
 * Uses Intersection Observer to only request the image when visible.
 */
export default function Avatar({ src, name, size = 'w-10 h-10', className = '', ...props }: AvatarProps) {
    const [imgError, setImgError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff&bold=true`;

    // Intersection Observer to detect visibility
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' } // Start loading 100px before it enters viewport
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src]);

    // Reset error state if src changes
    useEffect(() => {
        setImgError(false);
    }, [src]);

    return (
        <img
            ref={imgRef}
            src={(!src || imgError) ? fallbackUrl : (isVisible ? src : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')}
            alt={name || 'Avatar'}
            onError={() => setImgError(true)}
            loading="lazy"
            className={`${size} rounded-full object-cover shrink-0 ${className}`}
            {...props}
        />
    );
}
