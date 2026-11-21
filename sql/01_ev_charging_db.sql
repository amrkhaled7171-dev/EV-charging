CREATE DATABASE  IF NOT EXISTS `ev_charging_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ev_charging_db`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: ev_charging_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alerts` (
  `alert_id` int NOT NULL AUTO_INCREMENT,
  `charger_id` varchar(20) NOT NULL,
  `type` enum('OVER_TEMP','OVER_CURRENT','BAD_VOLTAGE','OFFLINE','OTHER') DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`alert_id`),
  KEY `fk_alerts_charger` (`charger_id`),
  CONSTRAINT `fk_alerts_charger` FOREIGN KEY (`charger_id`) REFERENCES `chargers` (`charger_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alerts`
--

LOCK TABLES `alerts` WRITE;
/*!40000 ALTER TABLE `alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chargers`
--

DROP TABLE IF EXISTS `chargers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chargers` (
  `charger_id` varchar(20) NOT NULL,
  `station_id` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`charger_id`),
  KEY `fk_chargers_station` (`station_id`),
  CONSTRAINT `fk_chargers_station` FOREIGN KEY (`station_id`) REFERENCES `stations` (`station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chargers`
--

LOCK TABLES `chargers` WRITE;
/*!40000 ALTER TABLE `chargers` DISABLE KEYS */;
INSERT INTO `chargers` VALUES ('CH-001',1,'Fast Charger 01'),('CH-002',1,'Ultra Fast Charger'),('CH-003',1,'Standard Charger');
/*!40000 ALTER TABLE `chargers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `readings`
--

DROP TABLE IF EXISTS `readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `readings` (
  `reading_id` bigint NOT NULL AUTO_INCREMENT,
  `charger_id` varchar(20) NOT NULL,
  `voltage_v` decimal(6,2) DEFAULT NULL,
  `current_a` decimal(6,2) DEFAULT NULL,
  `power_kw` decimal(6,2) DEFAULT NULL,
  `temperature_c` decimal(5,2) DEFAULT NULL,
  `vehicle_connected` tinyint(1) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reading_id`),
  KEY `idx_charger_recorded` (`charger_id`,`recorded_at`),
  CONSTRAINT `fk_readings_charger` FOREIGN KEY (`charger_id`) REFERENCES `chargers` (`charger_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `readings`
--

LOCK TABLES `readings` WRITE;
/*!40000 ALTER TABLE `readings` DISABLE KEYS */;
INSERT INTO `readings` VALUES (1,'CH-001',230.50,16.00,3.68,42.50,1,'2026-10-24 17:23:58','2026-10-24 17:23:58'),(2,'CH-001',230.50,16.00,3.68,42.50,1,'2026-11-14 21:21:19','2026-11-14 22:21:19'),(3,'CH-001',231.00,20.00,4.62,45.00,1,'2026-11-14 21:36:19','2026-11-14 22:21:19'),(4,'CH-001',230.00,10.00,2.30,39.00,1,'2026-11-14 21:51:19','2026-11-14 22:21:19'),(5,'CH-001',230.50,18.00,4.14,43.00,1,'2026-11-14 22:06:19','2026-11-14 22:21:19'),(6,'CH-002',400.00,32.00,12.80,48.00,1,'2026-11-14 21:26:19','2026-11-14 22:21:19'),(7,'CH-002',400.00,40.00,16.00,52.00,1,'2026-11-14 21:41:19','2026-11-14 22:21:19'),(8,'CH-002',400.00,35.00,14.00,49.00,1,'2026-11-14 21:56:19','2026-11-14 22:21:19'),(9,'CH-002',400.00,0.00,0.00,38.00,0,'2026-11-14 22:11:19','2026-11-14 22:21:19'),(10,'CH-003',230.00,15.00,3.45,35.00,1,'2026-11-14 21:31:19','2026-11-14 22:21:19'),(11,'CH-003',230.00,18.00,4.14,37.00,1,'2026-11-14 21:46:19','2026-11-14 22:21:19'),(12,'CH-003',230.00,12.00,2.76,36.00,1,'2026-11-14 22:01:19','2026-11-14 22:21:19'),(13,'CH-003',230.00,0.00,0.00,34.00,0,'2026-11-14 22:16:19','2026-11-14 22:21:19');
/*!40000 ALTER TABLE `readings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stations`
--

DROP TABLE IF EXISTS `stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stations` (
  `station_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`station_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stations`
--

LOCK TABLES `stations` WRITE;
/*!40000 ALTER TABLE `stations` DISABLE KEYS */;
INSERT INTO `stations` VALUES (1,'Main Charging Station','Cairo - Downtown');
/*!40000 ALTER TABLE `stations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-14 22:59:51
