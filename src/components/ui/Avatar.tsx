import React, { useMemo } from "react";

interface AvatarProps {
    seed: string;
    size?: number;
    className?: string;
}

export default function Avatar({ seed, size = 40, className = "" }: AvatarProps) {
    const avatarUrl = useMemo(() => {
        return `https://api.dicebear.com/9.x/dylan/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&radius=50`;
    }, [seed]);

    return (
        <img
            src={avatarUrl}
            alt="User Avatar"
            width={size}
            height={size}
            className={`rounded-full bg-gray-100 object-cover ${className}`}
        />
    );
}
