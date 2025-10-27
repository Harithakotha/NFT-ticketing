import logging

import algokit_utils

logger = logging.getLogger(__name__)


# define deployment behaviour based on supplied app spec
def deploy() -> None:
    from smart_contracts.artifacts.nft_bookings.nft_bookings_client import (
        HelloArgs,
        NftBookingsFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer_ = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        NftBookingsFactory, default_sender=deployer_.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )


    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        # Fund the contract with more Algo for NFT creation and operations
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=10),  # Increased funding for NFT operations
                sender=deployer_.address,
                receiver=app_client.app_address,
            )
        )

    name = "world"
    response = app_client.send.hello(args=HelloArgs(name=name))
    logger.info(
        f"Called hello on {app_client.app_name} ({app_client.app_id}) "
        f"with name={name}, received: {response.abi_return}"
    )

    # Test ticket price retrieval
    price_response = app_client.send.get_ticket_price()
    logger.info(f"Ticket price: {price_response.abi_return} microAlgos")
