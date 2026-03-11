# SCRIPT PARA HABILITAR SQL SERVER TCP/IP (EJECUTAR COMO ADMINISTRADOR)

# 1. Identificar la instancia activa (SQLEXPRESS)
$instanceName = "SQLEXPRESS"
$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server"
$instanceId = (Get-ItemProperty "$regPath\Instance Names\SQL").$instanceName

# 2. Habilitar el protocolo TCP
$tcpPath = "$regPath\$instanceId\MSSQLServer\SuperSocketNetLib\Tcp"
Set-ItemProperty -Path $tcpPath -Name "Enabled" -Value 1

# 3. Configurar puerto 1433 para IPAll
$ipAllPath = "$tcpPath\IPAll"
Set-ItemProperty -Path $ipAllPath -Name "TcpPort" -Value "1433"
Set-ItemProperty -Path $ipAllPath -Name "TcpDynamicPorts" -Value ""

# 4. Reiniciar el servicio
Restart-Service "MSSQL`$$instanceName" -Force

Write-Host "TCP/IP Habilitado en puerto 1433 para $instanceName. Por favor reinicia la API."
