import { EmptyState } from "@ecom/ui/components/empty-state";
import { AddressForm } from "@/features/addresses/ui/address-form";
import { listAddresses } from "@/features/addresses/server";
import { storeCopy } from "@/messages/fa";

export default async function AddressesPage() {
  const result = await listAddresses();
  if (result.status === "unavailable") {
    return <EmptyState description={storeCopy.addressesUnavailable} heading="h1" title={storeCopy.addresses} />;
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{storeCopy.addresses}</h1>
      {result.addresses.length === 0 ? (
        <EmptyState description={storeCopy.addressesEmptyBody} title={storeCopy.addressesEmptyTitle} />
      ) : (
        <ul className="flex flex-col gap-3">
          {result.addresses.map((address) => (
            <li className="rounded-xl border p-4 text-sm" key={address.id}>
              <p className="font-medium">{address.recipientName}</p>
              <p>{address.province}، {address.city}</p>
              <p>{address.line1}</p>
              <p>{address.postalCode}</p>
              {address.isDefault ? <p>{storeCopy.defaultAddress}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <AddressForm />
    </div>
  );
}
