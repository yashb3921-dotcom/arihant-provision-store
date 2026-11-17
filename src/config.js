// Default shop settings. The admin can change most of these from Admin > Settings.
export const DEFAULT_SETTINGS = {
  shopName: 'Arihant Provision Stores',
  phone: '9881469046',
  whatsapp: '9881469046',
  address: 'MWG2+VHX, Vadgaon, Alandi, Maharashtra',
  hours: '8:00 AM - 10:00 PM',
  shopLat: 18.677063428780638,
  shopLng: 73.90136766805423,
  ratePerKm: 10,
  freeAbove: 399,
  maxKm: 7,
  minOrder: 0,
  isOpen: true,
}

export const STATUSES = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered']
export const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD
export const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET
