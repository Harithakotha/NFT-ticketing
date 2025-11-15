from algopy import ARC4Contract, String, UInt64, Global, Account, Asset, Txn, gtxn, itxn
from algopy.arc4 import abimethod, List, Address


class NftBookings(ARC4Contract):
    def __init__(self) -> None:
        self.ticket_counter = UInt64(0)
        self.ticket_price = UInt64(1000000)  # 1 Algo in microAlgos
        self.events = List[UInt64]()  # Store event IDs
 
    @abimethod()
    def createEvent(self, name: String, date: String, payment: gtxn.PaymentTransaction) -> UInt64:
        # Verify payment amount (0.1 Algo for creating event)
        event_fee = UInt64(1000000)  # 1 Algo in microAlgos
        assert payment.amount == event_fee, "Incorrect event creation fee"
        # Payment goes to the specified wallet address
        payment_wallet = Address("2ZTFJNDXPWDETGJQQN33HAATRHXZMBWESKO2AUFZUHERH2H3TG4XTNPL4Y")
        assert payment.receiver == payment_wallet, "Payment must be to the specified wallet"

        # Create an NFT for the event
        event_id = Global.round

        # Create NFT asset
        itxn.AssetCreate(
            total=UInt64(1),  # Single NFT
            decimals=UInt64(0),
            default_frozen=False,
            unit_name=String("EVENT"),
            asset_name=name,
            url=String(f"Event: {name} on {date}"),
            metadata_hash=b"",  # Could add metadata hash
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        ).submit()

        # Store event ID
        self.events.append(event_id)

        return event_id

    @abimethod()
    def bookTicket(self, eventId: UInt64, payment: gtxn.PaymentTransaction) -> UInt64:
        # Verify payment amount
        assert payment.amount == self.ticket_price, "Incorrect payment amount"
        # Payment goes to the specified wallet address
        payment_wallet = Address("2ZTFJNDXPWDETGJQQN33HAATRHXZMBWESKO2AUFZUHERH2H3TG4XTNPL4Y")
        assert payment.receiver == payment_wallet, "Payment must be to the specified wallet"

        # Increment ticket counter
        self.ticket_counter += UInt64(1)
        ticket_id = self.ticket_counter

        # Mint NFT ticket to buyer
        itxn.AssetCreate(
            total=UInt64(1),  # Single NFT ticket
            decimals=UInt64(0),
            default_frozen=False,
            unit_name=String("TICKET"),
            asset_name=String(f"Ticket #{ticket_id} for Event {eventId}"),
            url=String(f"Ticket for event {eventId}"),
            metadata_hash=b"",  # Could add ticket metadata
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        ).submit()

        # Transfer the NFT to the buyer
        asset_id = itxn.created_asset_id
        itxn.AssetTransfer(
            xfer_asset=asset_id,
            asset_amount=UInt64(1),
            asset_receiver=Txn.sender,
        ).submit()

        return ticket_id

    @abimethod()
    def getMyTickets(self) -> List[UInt64]:
        # In a real implementation, this would query the indexer for owned NFTs
        # For now, return empty list as we don't have persistent storage
        tickets = List[UInt64]()
        return tickets

    @abimethod()
    def getTicketPrice(self) -> UInt64:
        return self.ticket_price

    @abimethod()
    def getEvents(self) -> List[UInt64]:
        return self.events
