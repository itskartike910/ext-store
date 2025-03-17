/* global chrome */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaPlus, FaWallet, FaBolt, FaUserCircle, FaCompass, FaCopy, FaEthereum, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { fetchAllSolanaAssets, fetchSepoliaEthereumBalance, fetchEclipseBalance } from '../utils/tokenUtils';
import btcIcon from '../assets/btc.svg';
import solIcon from '../assets/sol.svg';
import eclipseIcon from '../assets/eclipse.png';
import ethereumIcon from '../assets/ethereum.png';

const Accounts = () => {
  const location = useLocation();
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState({});
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [eclipseBalances, setEclipseBalances] = useState({});

  useEffect(() => {
    const fetchAccounts = () => {
      chrome.wootzapp.getAllAccounts((result) => {
        if (result.success) {
          setAccounts(result.accounts);
          
          // Initialize loading states for balances only
          const loadingStates = {};
          result.accounts.forEach(account => {
            loadingStates[account.address] = true;
          });
          setLoadingBalances(loadingStates);
          
          // Fetch balances in background
          setTimeout(() => fetchBalances(result.accounts), 100);
        } else {
          setError(result.error || "Failed to fetch accounts");
        }
      });
    };

    fetchAccounts();
  }, []);

  const fetchBalances = async (accountsList) => {
    for (const account of accountsList) {
      try {
        let balance;
        if (account.coin === 501) {
          balance = 0.0000; // Solana balance placeholder
          
          // Additionally fetch Eclipse balance for Solana accounts
          try {
            const eclipseBalance = await fetchEclipseBalance(account.address);
            setEclipseBalances(prev => ({
              ...prev,
              [account.address]: eclipseBalance
            }));
          } catch (eclipseError) {
            console.error(`Error fetching Eclipse balance for ${account.address}:`, eclipseError);
            setEclipseBalances(prev => ({
              ...prev,
              [account.address]: 0
            }));
          }
        } else if (account.coin === 60) {
          balance = await fetchSepoliaEthereumBalance(account.address);
          console.log(`Fetched ETH balances for ${account.address}:`, balance);
          // No need to convert here as balance is now an object
        }
        
        setBalances(prev => ({
          ...prev,
          [account.address]: balance
        }));
      } catch (error) {
        console.error(`Error fetching balance for ${account.address}:`, error);
        setBalances(prev => ({
          ...prev,
          [account.address]: account.coin === 501 ? { solBalance: {} } : 0
        }));
      } finally {
        setLoadingBalances(prev => ({
          ...prev,
          [account.address]: false
        }));
      }
    }
  };

  const handleAccountClick = (account) => {
    setSelectedAccount(selectedAccount?.address === account.address ? null : account);
  };

  const getCoinIcon = (coinType) => {
    switch (coinType) {
      case 60: return <FaEthereum className="text-[#627EEA] h-6 w-6" />;
      case 1: return <img src={btcIcon} alt="Bitcoin" className="h-6 w-6" />;
      case 501: return <img src={solIcon} alt="Solana" className="h-6 w-6" />;
      default: return <span className="text-gray-400">?</span>;
    }
  };

  const getChainTag = (coinType) => {
    switch (coinType) {
      case 60: return "Ethereum + EVM Chains";
      case 501: return "Solana + SVM Chains";
      default: return "Other";
    }
  };

  const renderCollapsedBalance = (account) => {
    if (loadingBalances[account.address]) {
      return (
        <div className="flex flex-col items-end">
          <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-4 w-12 bg-gray-200 animate-pulse rounded mt-1"></div>
        </div>
      );
    }

    if (account.coin === 501) {
      const balance = balances[account.address]?.solBalance || {};
      const total = Object.values(balance).reduce((sum, val) => sum + (Number(val) || 0), 0);
      return (
        <div className="flex flex-col items-end">
          <span className="text-lg font-semibold">{Number(total).toFixed(4)}</span>
          <span className="text-sm text-gray-500">SOL</span>
        </div>
      );
    }

    if (account.coin === 60) {
      // For ETH accounts, show the combined balance
      const ethBalances = balances[account.address] || { sepolia: 0, mainnet: 0 };
      const total = (ethBalances.sepolia || 0) + (ethBalances.mainnet || 0);
      return (
        <div className="flex flex-col items-end">
          <span className="text-lg font-semibold">
            {typeof total === 'number' ? total.toFixed(4) : '0.0000'}
          </span>
          <span className="text-sm text-gray-500">ETH</span>
        </div>
      );
    }

    return null;
  };

  const renderBalance = (account) => {
    if (selectedAccount?.address !== account.address) return null;

    if (loadingBalances[account.address]) {
      return (
        <div className="mt-4 space-y-2">
          {['mainnet-beta', 'devnet', 'testnet'].map((network) => (
            <div key={network} className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      );
    }

    if (account.coin === 501) {
      const balance = balances[account.address]?.solBalance || {};
      const eclipseBalance = eclipseBalances[account.address] || 0;
      
      return (
        <div className="mt-4 space-y-2">
          {Object.entries(balance).map(([network, amount]) => (
            <div key={network} className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <span className="text-gray-500 capitalize">{network}</span>
              <span className={Number(amount) > 0 ? 'font-medium' : 'text-gray-400'}>
                {`${Number(amount).toFixed(4)} SOL`}
              </span>
            </div>
          ))}
          
          {/* Add Eclipse balance display */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex justify-between items-center">
            <span className="text-gray-500 flex items-center">
              <img src={eclipseIcon} alt="Eclipse" className="h-4 w-4 mr-1" /> 
              Eclipse
            </span>
            <span className={Number(eclipseBalance) > 0 ? 'font-medium' : 'text-gray-400'}>
              {`${Number(eclipseBalance).toFixed(4)} ETH`}
            </span>
          </div>
        </div>
      );
    }
    
    if (account.coin === 60) {
      const ethBalances = balances[account.address] || { sepolia: 0, mainnet: 0 };
      return (
        <div className="mt-4 space-y-2">
          {/* <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex justify-between items-center">
            <span className="text-gray-500 flex items-center">
              <img src={ethereumIcon} alt="Ethereum" className="h-4 w-4 mr-1" /> 
              Sepolia
            </span>
            <span className={Number(ethBalances.sepolia) > 0 ? 'font-medium' : 'text-gray-400'}>
              {`${Number(ethBalances.sepolia || 0).toFixed(4)} ETH`}
            </span>
          </div> */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex justify-between items-center">
            <span className="text-gray-500 flex items-center">
              <FaEthereum className="text-[#627EEA] h-4 w-4 mr-1" />
              Mainnet
            </span>
            <span className={Number(ethBalances.mainnet) > 0 ? 'font-medium' : 'text-gray-400'}>
              {`${Number(ethBalances.mainnet || 0).toFixed(4)} ETH`}
            </span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF3B30] to-[#FF8C00] text-transparent bg-clip-text">
          Accounts
        </h1>
        {/* <button className="text-[#FF8C00] hover:text-[#FF3B30] transition-colors">
          <FaPlus size={24} />
        </button> */}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
          Error: {error}
        </div>
      )}

      <div className="flex-grow">
        {accounts.map((account, index) => (
          <div 
            key={index} 
            className="bg-gray-50 rounded-xl p-4 mb-4 border border-[#FF8C00] cursor-pointer shadow-md"
            onClick={() => handleAccountClick(account)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="text-lg">
                  {getCoinIcon(account.coin)}
                </div>
                <div className="flex flex-col w-full">
                  <h2 className="font-semibold text-base">{account.name}</h2>
                  <span className="text-xs text-black bg-gray-200 px-2 py-0.5 mt-1 rounded-full inline-block self-center">
                    {getChainTag(account.coin)}
                  </span>
                </div>
              </div>
              <div className="text-gray-400">
                {selectedAccount?.address === account.address ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">
                  {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                </span>
                <button
                  className="text-[#FF8C00] hover:text-[#FF3B30] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(account.address);
                  }}
                  title="Copy address"
                >
                  <FaCopy />
                </button>
              </div>
              {/* <div className="text-right">
                {renderCollapsedBalance(account)}
              </div> */}
            </div>

            {selectedAccount?.address === account.address && (
              <div className="mt-4 border-t pt-4">
                {renderBalance(account)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* <div className="mt-6 mb-20">
        <button className="w-full bg-gradient-to-r from-[#FF3B30] to-[#FF8C00] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg">
          Add Account
        </button>
      </div> */}

      {/* <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-between max-w-sm mx-auto">
          {[
            // { icon: <FaWallet size={16} />, label: 'Portfolio', path: '/portfolio' },
            // { icon: <FaBolt size={16} />, label: 'Activity', path: '/activity' },
            { icon: <FaUserCircle size={16} />, label: 'Accounts', path: '/accounts' },
            // { icon: <FaCompass size={16} />, label: 'Explore', path: '/explore' },
            // { icon: <FaCompass size={16} />, label: 'Send', path: '/send' },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex flex-col items-center px-2 ${
                location.pathname === item.path
                  ? 'text-[#FF8C00]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav> */}
    </div>
  );
};

export default Accounts;