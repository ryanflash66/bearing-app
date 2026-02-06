interface OrderStatusEmailProps {
  serviceName: string;
  statusLabel: string;
  orderUrl: string;
  additionalInfo?: string;
}

export default function OrderStatusEmail({
  serviceName,
  statusLabel,
  orderUrl,
  additionalInfo,
}: OrderStatusEmailProps) {
  return (
    <div>
      <h1>Update on your {serviceName} Request</h1>
      <p>Your {serviceName} request status has been updated.</p>
      <p>
        <strong>Current Status:</strong> {statusLabel}
      </p>
      {additionalInfo ? <p>{additionalInfo}</p> : null}
      <p>
        <a href={orderUrl}>View Order Details</a>
      </p>
    </div>
  );
}
