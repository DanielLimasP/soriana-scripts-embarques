const shipmentLocations = require("./embarquesConIncidencia.json");
const json2xls = require("json2xls");
const fs = require("fs");

const currentDate = new Date().toISOString().split("T")[0];

const config = {
  DETAILED_REPORT_OUTPUT: `./reportes/reporte_detallado_embarques_${currentDate}.xlsx`,
  GENERAL_REPORT_OUTPUT: `./reportes/reporte_general_embarques_${currentDate}.xlsx`,
};

const formatDataForReport = (
  shipmentLocation,
  pendingTransfersString,
  errorOnTransfer,
  isGeneralReport
) => {
  const { shipment, externalId, cedis, location } = shipmentLocation;
  const reportData = {
    tienda: location,
    cedis,
    embarque: shipment,
    guia: externalId,
    transferencia: pendingTransfersString,
    creacion: shipmentLocation.day,
    arribo: shipmentLocation.arrivedAt,
  };
  if (!isGeneralReport) {
    reportData.error = errorOnTransfer;
    delete reportData.creacion;
    delete reportData.arribo;
  }
  return reportData;
};

const searchForPendingOrProcessingTransfersInData = () => {
  const ERROR_STATUS = ["PENDING", "PROCESSING"];
  let counter = 0;
  const detailedData = [];
  const generalData = [];
  for (const shipmentLocation of shipmentLocations) {
    let sapTransferMovements = JSON.parse(
      shipmentLocation.sapTransferMovements
    );
    let sapTransfersString = "";
    if (sapTransferMovements.offloadingMovements) {
      for (const offloadingMovement of sapTransferMovements.offloadingMovements) {
        if (ERROR_STATUS.includes(offloadingMovement.status)) {
          sapTransfersString += offloadingMovement.transferNumber + ", ";
          const errors = offloadingMovement.error?.split(", ");
          if (errors) {
            for (const error of errors) {
              const detailedShipmentStatus = formatDataForReport(
                shipmentLocation,
                offloadingMovement.transferNumber,
                error
              );
              detailedData.push(detailedShipmentStatus);
            }
          } else {
            const detailedShipmentStatus = formatDataForReport(
              shipmentLocation,
              offloadingMovement.transferNumber,
              offloadingMovement.error
            );
            detailedData.push(detailedShipmentStatus);
          }
        }
      }
    }
    const generalShipmentStatus = formatDataForReport(
      shipmentLocation,
      sapTransfersString,
      "",
      true
    );
    generalData.push(generalShipmentStatus);
  }
  const xlsxOutputFileForDetailedReport = json2xls(detailedData);
  const xlsxOutputFileForGeneralReport = json2xls(generalData);
  fs.writeFileSync(
    config.DETAILED_REPORT_OUTPUT,
    xlsxOutputFileForDetailedReport,
    "binary"
  );
  fs.writeFileSync(
    config.GENERAL_REPORT_OUTPUT,
    xlsxOutputFileForGeneralReport,
    "binary"
  );
  console.log(`Creado el reporte detallado de embarques con incidencias.`);
  console.log(`Creado el concentrado de embarques con incidencia.`);
};

searchForPendingOrProcessingTransfersInData();
