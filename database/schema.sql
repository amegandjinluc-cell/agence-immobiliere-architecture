-- Schema Plateforme Immobilier
-- Exécuter : mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS immobilier;
USE immobilier;

-- Table utilisateurs (admin)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table biens immobiliers
CREATE TABLE IF NOT EXISTS biens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('Maison','Appartement','Immeuble','Terrain','Bureau','Autre') NOT NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  prix DECIMAL(12,2) NOT NULL,
  devise VARCHAR(10) DEFAULT 'FCFA',
  localite VARCHAR(255) NOT NULL,
  quartier VARCHAR(255),
  statut ENUM('Disponible','Loué','Vendu','Sous compromis') DEFAULT 'Disponible',
  pieces INT,
  superficie_m2 DECIMAL(8,2),
  equipements TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table photos
CREATE TABLE IF NOT EXISTS photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bien_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  ordre INT DEFAULT 0,
  FOREIGN KEY (bien_id) REFERENCES biens(id) ON DELETE CASCADE
);

-- Admin seed (mot de passe : admin123 — à changer en prod)
INSERT INTO users (email, password_hash) VALUES
  ('admin@immobilier.tg', '$2b$10$rQZ8k1X2v3Y4w5A6b7C8dOePf0g1H2i3J4k5L6m7N8o9P0q1R2s3T');
