const shipmentsInApp = require("./data/embarquesEnApp.json");
const shipmentsInFile = require("./data/embarquesEnSLS.json");
const cityClubLocations = require("./data/cityClubLocations.json");
const json2xls = require("json2xls");
const fs = require("fs");

const currentDate = new Date().toISOString().split("T")[0].replaceAll("-", "_");

const config = {
  IN_APP: `./reportes/embarques_en_app_${currentDate}.xlsx`,
  NOT_IN_APP: `./reportes/embarques_no_en_app_${currentDate}.xlsx`,
};

const queryWritter = fs.createWriteStream("./consulta.sql", { flags: "w" });

const filterShipmentsFromFile = () => {
  const shipmentsInAppFiltered = [];
  for (const shipmentInApp of shipmentsInApp) {
    const shipmentInFile = shipmentsInFile.find(
      (shipment) =>
        String(shipment.Id_Fol_Emb) === shipmentInApp.noEmbarque &&
        String(shipment.Id_Destino) === shipmentInApp.tienda
    );
    if (shipmentInFile) {
      shipmentsInAppFiltered.push(shipmentInApp);
      continue;
    }
  }
  console.log(
    "Embarques en bd de aplicativo que se encuentran en archivo analizado: ",
    shipmentsInAppFiltered.length
  );
  const inAppXlsxOutputFile = json2xls(shipmentsInAppFiltered);
  fs.writeFileSync(config.IN_APP, inAppXlsxOutputFile, "binary");
};

const obtainShipmentsNotInApp = () => {
  const shipmentsNotInApp = [];
  for (const shipmentInFile of shipmentsInFile) {
    const shipmentInApp = shipmentsInApp.find(
      (shipment) =>
        String(shipmentInFile.Id_Fol_Emb) === shipment.noEmbarque &&
        String(shipmentInFile.Id_Destino) === shipment.tienda
    );
    if (!shipmentInApp) {
      shipmentsNotInApp.push(shipmentInFile);
      continue;
    }
  }
  if (shipmentsNotInApp.length) {
    console.log(
      "Actualmente hay",
      shipmentsNotInApp.length,
      " embarques que no están replicados en bd de aplicativo."
    );
    const notInAppXlsxOutputFile = json2xls(shipmentsNotInApp);
    fs.writeFileSync(config.NOT_IN_APP, notInAppXlsxOutputFile, "binary");
  } else {
    console.log(
      "Actualmente no hay embarques que no estén replicados en la app."
    );
  }
};

const countShipmentsInCityClubLocations = () => {
  let cityClubLocationCounter = 0;
  let normalLocationCounter = 0;
  for (const shipmentInFile of shipmentsInFile) {
    const isCityClubLocation = cityClubLocations.find(
      (location) => location.externalId === String(shipmentInFile.Id_Destino)
    );
    if (isCityClubLocation) {
      cityClubLocationCounter += 1;
    } else {
      normalLocationCounter += 1;
    }
  }
  return { cityClubLocationCounter, normalLocationCounter };
};

const createQueryForShipmentsInApp = () => {
  let query = `
    SELECT 
      b.number as "noEmbarque",
      a.externalId as "guia",
      c.externalId as "cedis",
      c.name as "nombreCedis",
      d.externalId as "tienda",
      d.name as "nombreTienda",
      a.arrivedAt as "arribo",
      a.offloadingAt as "descarga",
      a.readyToLeaveAt as "marchamos",
      a.leftAt as "recibo",
      a.finishedAt as "finalizo",
      b.createdAt as "creacion",
      a.deletedAt as "borrado",
      b.processingAt as "procesado",
      a.claimMissingTrackingNumber as "reclamacion"
    FROM shipmentslocations as a
      LEFT JOIN shipments as b on a.shipmentId = b.id
      LEFT JOIN locations as c on a.locationFromId = c.id
      LEFT JOIN locations as d on a.locationToId = d.id
    WHERE 
      b.number in (
    `;
  for (const shipmentInFile of shipmentsInFile) {
    query += shipmentInFile.Id_Fol_Emb + ", ";
  }
  query += ");";
  queryWritter.write(query);
};

const main = () => {
  createQueryForShipmentsInApp();
  console.log("Consulta para obtener embarques en app creada.");
  const { normalLocationCounter, cityClubLocationCounter } =
    countShipmentsInCityClubLocations();
  console.log("-------------------------");
  console.log("Resultados:");
  console.log("-------------------------");
  console.log("Embarques en tienda: ", normalLocationCounter);
  console.log("Embarques en city club: ", cityClubLocationCounter);
  console.log("-------------------------");
  console.log("Embarques en archivo: ", shipmentsInFile.length);
  console.log("-------------------------");
  filterShipmentsFromFile();
  obtainShipmentsNotInApp();
  console.log("-------------------------");
};

main();
