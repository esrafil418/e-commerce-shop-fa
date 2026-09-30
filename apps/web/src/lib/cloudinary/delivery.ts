import { readPublicEnv } from "@/lib/env/public";

const unsafePublicId = /[?#]|^\.|\.\./u;

export function buildCloudinaryUrl(
  cloud: string,
  publicId: string,
  width: number,
  resource: "image" | "video" = "image",
): string | null {
  const cloudName = cloud.trim();
  const id = publicId.trim();
  if (!cloudName || !id || unsafePublicId.test(id) || !Number.isInteger(width) || width < 1) {
    return null;
  }

  return `https://res.cloudinary.com/${cloudName}/${resource}/upload/f_auto,q_auto,w_${width},c_limit/${id}`;
}

export function deliveryUrl(
  publicId: string,
  width: number,
  resource: "image" | "video" = "image",
): string | null {
  return buildCloudinaryUrl(
    readPublicEnv().NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    publicId,
    width,
    resource,
  );
}
