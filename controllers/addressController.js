import UserAddress from '../models/UserAddress.js';

export const getAddresses = async (req, res) => {
  try {
    const addresses = await UserAddress.findByUserId(req.user.id);
    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:::', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const createAddress = async (req, res) => {
  try {
    const { label, detail, isDefault } = req.body;

    if (!label || !detail) {
      return res
        .status(400)
        .json({ message: 'Address label and detail are required.' });
    }

    const id = await UserAddress.create({
      userId: req.user.id,
      label,
      detail,
      isDefault,
    });

    res.status(201).json({ id, label, detail, isDefault: Boolean(isDefault) });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { label, detail, isDefault } = req.body;
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'Address id is required.' });
    }

    if (!label || !detail) {
      return res
        .status(400)
        .json({ message: 'Address label and detail are required.' });
    }

    const updated = await UserAddress.update({
      id,
      userId: req.user.id,
      label,
      detail,
      isDefault,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Address not found.' });
    }

    res.json({ id, label, detail, isDefault: Boolean(isDefault) });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
